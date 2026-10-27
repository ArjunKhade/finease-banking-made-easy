package com.eazybytes.accounts.mapper;

import com.eazybytes.accounts.dto.AccountsDto;
import com.eazybytes.accounts.entity.Accounts;

public class AccountsMapper {

    public static AccountsDto mapToAccountsDto(Accounts accounts, AccountsDto accountsDto){
        accountsDto.setAccountNumber(accounts.getAccountNumber());
        accountsDto.setAccountType(accounts.getAccountType());
        accountsDto.setBranchAddress(accounts.getBranchAddress());
        accountsDto.setBalance(accounts.getBalance());
        return accountsDto;
    }

    public static Accounts mapToAccounts(AccountsDto accountsDto, Accounts accounts){
       accounts.setAccountNumber(accountsDto.getAccountNumber());
       accounts.setAccountType(accountsDto.getAccountType());
       accounts.setBranchAddress(accountsDto.getBranchAddress());
       if (accountsDto.getBalance() != null) {
           accounts.setBalance(accountsDto.getBalance());
       }
       return accounts;
    }

}
