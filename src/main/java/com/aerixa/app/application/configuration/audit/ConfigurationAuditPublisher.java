package com.aerixa.app.application.configuration.audit;

public interface ConfigurationAuditPublisher {
    void publish(ConfigurationAuditEvent event);
}
