package com.eazybytes.accounts.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(
        name = "CustomerDetails",
        description = "Schema to hold Customer Account, Loan, Card information"
)
public class CustomerDetailsDto {

    @NotEmpty(message = "Name is required field. It cannot be empty or null")
    @Size(min = 5, max = 30, message = "The lenght of the name cannot be exceed 5 -30")
    @Schema(
            description = "Name of the customer", example = "Eazy Bytes"
    )
    private String name;

    @NotEmpty(message = "Email is required field. It cannot be empty or null")
    @Email(message = "Please Enter valid email.")
    @Schema(
            description = "Email address of the customer", example = "tutor@eazybytes.com"
    )
    private String email;

    @Pattern(regexp = "^$|[0-9]{10}", message = "Mobile Number must have 10 digit.")
    @Schema(
            description = "Mobile Number of the customer", example = "9345432123"
    )
    private String mobileNumber;

    @Schema(
            description = "Account details of the Customer"
    )
    private AccountsDto accountsDto;

    @Schema(
            description = "Loans details of the Customer"
    )
    private LoansDto loansDto;

    @Schema(
            description = "Cards details of the Customer"
    )
    private CardsDto cardsDto;

}
