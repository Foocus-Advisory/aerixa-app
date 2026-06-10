package com.aerixa.app.domain.auth.entity;

import com.aerixa.app.domain.shared.entity.SoftDeletableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "users", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class User extends SoftDeletableEntity {

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(length = 100)
    private String username;

    @Column(length = 100, name = "first_name")
    private String firstName;

    @Column(length = 100, name = "last_name")
    private String lastName;

    @Column(length = 20, name = "phone_number")
    private String phoneNumber;

    @Column(length = 255, name = "address_line_1")
    private String addressLine1;

    @Column(length = 255, name = "address_line_2")
    private String addressLine2;

    @Column(length = 120, name = "city")
    private String city;

    @Column(length = 40, name = "postal_code")
    private String postalCode;

    @Column(length = 120, name = "country")
    private String country;

    @Column(length = 1000, name = "bio")
    private String bio;

    @Basic(fetch = FetchType.LAZY)
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "profile_photo", columnDefinition = "bytea")
    private byte[] profilePhoto;

    @Column(length = 120, name = "profile_photo_content_type")
    private String profilePhotoContentType;

    @Column(length = 255, name = "profile_photo_filename")
    private String profilePhotoFilename;

    @Column(nullable = false, length = 255, name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "user_status")
    private UserStatus status = UserStatus.PENDING_VERIFICATION;

    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @Column(name = "must_change_password", nullable = false)
    private Boolean mustChangePassword = false;

    @Column(name = "mfa_enabled", nullable = false)
    private Boolean mfaEnabled = false;

    @Column(name = "mfa_method", length = 50)
    private String mfaMethod;

    @Column(name = "totp_secret", length = 512)
    private String totpSecret;

    @Column(name = "mfa_verified_at")
    private LocalDateTime mfaVerifiedAt;

    @Column(name = "google_subject", length = 255)
    private String googleSubject;

    @Column(name = "google_linked_at")
    private LocalDateTime googleLinkedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_admin_id")
    private User parentAdmin;

    @OneToMany(mappedBy = "parentAdmin", fetch = FetchType.LAZY)
    private Set<User> childOperators = new HashSet<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        schema = "auth",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    public enum UserStatus {
        ACTIVE, DISABLED, PENDING_VERIFICATION
    }

    public boolean hasPermission(String permission) {
        return roles.stream()
            .anyMatch(role -> role.getPermissions().stream()
                .anyMatch(perm -> perm.getName().equals(permission)));
    }

    public boolean hasRole(String roleName) {
        return roles.stream().anyMatch(r -> r.getName().equals(roleName));
    }

    public boolean hasProfilePhoto() {
        return profilePhoto != null && profilePhoto.length > 0;
    }
}
