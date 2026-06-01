package com.aerixa.app.infrastructure.config;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "aerixaNeonDatabaseUrl";
    private static final String JDBC_PREFIX = "jdbc:postgresql://";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String rawDatabaseUrl = firstNonBlank(
                environment.getProperty("DATABASE_URL"),
                environment.getProperty("DB_URL")
        );

        if (rawDatabaseUrl == null) {
            return;
        }

        String jdbcUrl = toJdbcPostgresUrl(rawDatabaseUrl);
        if (jdbcUrl == null) {
            return;
        }

        String normalizedJdbcUrl = normalizeQueryParameters(jdbcUrl);
        CredentialsSplit split = splitCredentialsFromJdbcUrl(normalizedJdbcUrl);

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("spring.datasource.url", split.jdbcUrlWithoutCredentials);

        String existingUsername = environment.getProperty("DB_USERNAME");
        String existingPassword = environment.getProperty("DB_PASSWORD");

        if (isBlank(existingUsername) && split.username != null) {
            properties.put("spring.datasource.username", split.username);
        }
        if (isBlank(existingPassword) && split.password != null) {
            properties.put("spring.datasource.password", split.password);
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private static String firstNonBlank(String... candidates) {
        for (String value : candidates) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static String toJdbcPostgresUrl(String rawUrl) {
        String trimmed = stripWrappingQuotes(rawUrl.trim());

        if (trimmed.startsWith("jdbc:postgresql://")) {
            return trimmed;
        }
        if (trimmed.startsWith("postgresql://")) {
            return "jdbc:" + trimmed;
        }
        if (trimmed.startsWith("postgres://")) {
            return "jdbc:postgresql://" + trimmed.substring("postgres://".length());
        }
        return null;
    }

    private static String normalizeQueryParameters(String jdbcUrl) {
        int queryIndex = jdbcUrl.indexOf('?');
        if (queryIndex < 0 || queryIndex == jdbcUrl.length() - 1) {
            return jdbcUrl;
        }

        String base = jdbcUrl.substring(0, queryIndex);
        String query = jdbcUrl.substring(queryIndex + 1);
        String[] params = query.split("&");
        List<String> normalizedParams = new ArrayList<>(params.length);

        for (String param : params) {
            if (param == null || param.isBlank()) {
                continue;
            }

            int equalsIndex = param.indexOf('=');
            if (equalsIndex < 0) {
                normalizedParams.add(param);
                continue;
            }

            String key = param.substring(0, equalsIndex);
            String value = param.substring(equalsIndex + 1);

            if ("channel_binding".equals(key)) {
                key = "channelBinding";
            }

            normalizedParams.add(key + "=" + value);
        }

        if (normalizedParams.isEmpty()) {
            return base;
        }

        return base + "?" + String.join("&", normalizedParams);
    }

    private static CredentialsSplit splitCredentialsFromJdbcUrl(String jdbcUrl) {
        if (!jdbcUrl.startsWith(JDBC_PREFIX)) {
            return new CredentialsSplit(jdbcUrl, null, null);
        }

        String afterPrefix = jdbcUrl.substring(JDBC_PREFIX.length());
        int atIndex = afterPrefix.indexOf('@');
        if (atIndex < 0) {
            return new CredentialsSplit(jdbcUrl, null, null);
        }

        String userInfo = afterPrefix.substring(0, atIndex);
        String hostAndPath = afterPrefix.substring(atIndex + 1);
        String cleanJdbcUrl = JDBC_PREFIX + hostAndPath;

        int colonIndex = userInfo.indexOf(':');
        String rawUsername;
        String rawPassword;

        if (colonIndex < 0) {
            rawUsername = userInfo;
            rawPassword = "";
        } else {
            rawUsername = userInfo.substring(0, colonIndex);
            rawPassword = userInfo.substring(colonIndex + 1);
        }

        String username = decode(rawUsername);
        String password = decode(rawPassword);

        return new CredentialsSplit(cleanJdbcUrl, username, password);
    }

    private static String decode(String value) {
        if (value == null) {
            return null;
        }
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static String stripWrappingQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1).trim();
            }
        }
        return value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record CredentialsSplit(String jdbcUrlWithoutCredentials, String username, String password) {
    }
}
