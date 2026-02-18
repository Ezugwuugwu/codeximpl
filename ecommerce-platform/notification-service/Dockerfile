FROM maven:3.9.9-eclipse-temurin-17 AS build
ARG MODULE
WORKDIR /workspace
COPY . .
RUN mvn -B -pl ${MODULE} -am -DskipTests clean package

FROM eclipse-temurin:17-jre
ARG MODULE
WORKDIR /app
COPY --from=build /workspace/${MODULE}/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
