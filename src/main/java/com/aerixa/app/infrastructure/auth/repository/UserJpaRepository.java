package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserJpaRepository extends JpaRepository<User, UUID>, UserRepository {
    @Override
    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    @Override
    boolean existsByEmail(String email);

    Page<User> findAllByStatus(User.UserStatus status, Pageable pageable);

    Page<User> findAllByParentAdminId(UUID parentAdminId, Pageable pageable);

    Page<User> findAllByParentAdminIdAndStatus(UUID parentAdminId, User.UserStatus status, Pageable pageable);

    java.util.List<User> findByStatus(User.UserStatus status, Sort sort);

    long countByStatus(User.UserStatus status);

    @Query(value = "select * from auth.users u where u.deleted_at is not null",
            countQuery = "select count(*) from auth.users u where u.deleted_at is not null",
            nativeQuery = true)
    Page<User> findAllDeleted(Pageable pageable);

        @Query(value = "select * from auth.users u where u.deleted_at is not null and u.parent_admin_id = :parentAdminId",
            countQuery = "select count(*) from auth.users u where u.deleted_at is not null and u.parent_admin_id = :parentAdminId",
            nativeQuery = true)
        Page<User> findAllDeletedByParentAdminId(@Param("parentAdminId") UUID parentAdminId, Pageable pageable);

    @Query(value = "select * from auth.users u where u.id = :id", nativeQuery = true)
    Optional<User> findByIdIncludingDeleted(@Param("id") UUID id);

    @Modifying
    @Query(value = "update auth.users set deleted_at = null, updated_at = current_timestamp where id = :id and deleted_at is not null", nativeQuery = true)
    int restoreById(@Param("id") UUID id);

    @Modifying
    @Query(value = "delete from auth.user_roles where user_id = :id", nativeQuery = true)
    void deleteUserRolesByUserId(@Param("id") UUID id);

    @Modifying
    @Query(value = "delete from auth.sessions where user_id = :id", nativeQuery = true)
    void deleteSessionsByUserId(@Param("id") UUID id);

    @Modifying
    @Query(value = "delete from auth.users where id = :id", nativeQuery = true)
    int hardDeleteById(@Param("id") UUID id);

    @Query(value = "select count(*) from auth.users u where u.deleted_at is not null", nativeQuery = true)
    long countDeleted();
}
