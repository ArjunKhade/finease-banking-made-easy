package com.eazybytes.accounts.functions;

import com.eazybytes.accounts.service.IAccountService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.function.Consumer;

@Configuration
public class AccounstFunction {

    private static final Logger log = LoggerFactory.getLogger(AccounstFunction.class);

    @Bean
    public Consumer<Long> updateCommunication(IAccountService accountService){

        return  accountNumber -> {
            log.info("Updating communication status for the account number:"+ accountNumber.toString());
            accountService.updateCommunicationStatus(accountNumber);
        };

    }
}

