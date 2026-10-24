#Start with the base image containing java runtime
FROM eclipse-temurin:25-jdk-alpine

#Information about who maintain this image
LABEL "org.opencontainers.image.authors"="eazybytes.com"

#Copy the .jar into docker image
COPY target/accounts-0.0.1-SNAPSHOT.jar accounts-0.0.1-SNAPSHOT.jar

#Command will execute after running docker container
ENTRYPOINT ["java","-jar", "accounts-0.0.1-SNAPSHOT.jar"]