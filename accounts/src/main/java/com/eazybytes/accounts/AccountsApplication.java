package com.eazybytes.accounts;

import com.eazybytes.accounts.dto.AccountContactInfoDto;
import io.swagger.v3.oas.annotations.ExternalDocumentation;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableConfigurationProperties(value = {AccountContactInfoDto.class})
@EnableJpaAuditing(auditorAwareRef = "auditAwareImpl")
@OpenAPIDefinition(info = @Info(
        title = "Accounts Microservice REST API Documentation",
        description = "EasyBank Accounts Microservice REST API Documentation",
        version = "v1",
        contact = @Contact(
                name = "Arjun Khade",
                email = "khadearjun@gmail.com",
                url = "https://arjunkhade.github.io/modern-portfolio/"
        ),
        license = @License(
                name = "Apache 2.0",
                url = "https://arjunkhade.github.io/modern-portfolio/"
        )

      ),
        externalDocs = @ExternalDocumentation(
                description = "EasyBank Accounts Microservice REST API Documentation",
                url = "https://arjunkhade.github.io/modern-portfolio/"
        )

)
@EnableFeignClients
public class AccountsApplication {

	public static void main(String[] args) {
		SpringApplication.run(AccountsApplication.class, args);
	}

}
