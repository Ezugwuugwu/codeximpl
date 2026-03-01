# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS build
ARG MODULE
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -pl ${MODULE} -am -DskipTests clean package

FROM eclipse-temurin:21-jre
ARG MODULE
WORKDIR /app
COPY --from=build /workspace/${MODULE}/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:TieredStopAtLevel=1", "-jar", "/app/app.jar"]
