package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.repository.RoleRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleJpaRepository extends JpaRepository<Role, UUID>, RoleRepository {
    @Override
    Optional<Role> findByName(String name);

    List<Role> findAllByOrderByLevelAscNameAsc();

    @Query(
        value = """
            SELECT ur.role_id AS roleId, COUNT(*) AS usersCount
            FROM auth.user_roles ur
            JOIN auth.users u ON u.id = ur.user_id
            WHERE u.deleted_at IS NULL
            GROUP BY ur.role_id
            """,
        nativeQuery = true
    )
    List<RoleUserCountRow> countActiveUsersByRole();

    interface RoleUserCountRow {
        UUID getRoleId();
        Long getUsersCount();
    }
}
