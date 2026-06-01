package com.aerixa.app.infrastructure.config;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "aerixaNeonDatabaseUrl";

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

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("spring.datasource.url", jdbcUrl);
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
        String trimmed = rawUrl.trim();

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
}
