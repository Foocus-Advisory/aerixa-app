FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

# Copy pom + wrapper first to maximize layer cache for dependencies.
COPY pom.xml ./
COPY mvnw ./
COPY .mvn ./.mvn

RUN chmod +x mvnw
RUN ./mvnw -B -DskipTests dependency:go-offline

# Copy sources and package the application.
COPY src ./src
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /workspace/target/*.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=staging

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]