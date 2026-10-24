package com.easybank.gatewayserver.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class KeyclockRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    public Collection<GrantedAuthority> convert(Jwt source) {
        List<GrantedAuthority> grantedAuthorities = new ArrayList<>();

        // 1. Extract Realm Roles (e.g. ADMIN, MANAGER, USER)
        Map<String, Object> realmAccess = (Map<String, Object>) source.getClaims().get("realm_access");
        if (realmAccess != null && realmAccess.containsKey("roles")) {
            List<String> roles = (List<String>) realmAccess.get("roles");
            if (roles != null) {
                roles.stream()
                        .map(roleName -> "ROLE_" + roleName.toUpperCase())
                        .map(SimpleGrantedAuthority::new)
                        .forEach(grantedAuthorities::add);
            }
        }

        // 2. Extract Client Resource Roles (e.g. ACCOUNTS, CARDS, LOANS)
        Map<String, Object> resourceAccess = (Map<String, Object>) source.getClaims().get("resource_access");
        if (resourceAccess != null) {
            resourceAccess.values().forEach(resource -> {
                if (resource instanceof Map<?, ?> clientMap) {
                    Object rolesObj = clientMap.get("roles");
                    if (rolesObj instanceof List<?> clientRoles) {
                        clientRoles.stream()
                                .map(Object::toString)
                                .map(roleName -> "ROLE_" + roleName.toUpperCase())
                                .map(SimpleGrantedAuthority::new)
                                .forEach(grantedAuthorities::add);
                    }
                }
            });
        }

        return grantedAuthorities;
    }
}
