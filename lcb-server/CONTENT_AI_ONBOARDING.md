# Content AI Onboarding Guide

This guide will help you set up Content AI for your AEM integration.

## Prerequisites

- Access to Adobe Developer Console
- Access Content AI API in Developer Console
- Access to AEM Cloud Manager

## Setup Steps

### 1. Setup Content AI in Developer Console
- Navigate [https://developer.adobe.com/console/servicesandapis](https://developer.adobe.com/console/servicesandapis)
- Search for `AEM Content AI Services`
- Click `Create Project`
- Select `Server-to-Server Authentication` and click `Next`
- Select `OAuth Server-to-Server`. Enter any name (or leave default) for `Credential name` and click `Next`
- Select the product profile corresponding to your AEM instance and click `Save Configured API`
- In the project window, under **Credentials**, click on `OAuth Server-to-Server`
- Notice `Client ID`, `Client Secret` and `Scopes`. We will use these to setup the secrets in Cloud Manager

### 2. Setup Cloud Manager variables
- In Cloud Manager, navigate to your Environment
- Under Configuration -> Environment Configuration, click `Add/Update`
- Add the following env variables: `CONTENT_AI_CLIENT_ID`, `CONTENT_AI_CLIENT_SECRET` and `CONTENT_AI_TOKEN_SCOPE` with values corresponding to those in Developer Console. Make sure to select for all: Service Applied = All, Type = Secret
  
### 3. Setup Compute secrets
- In your AEM code, navigate to `config/compute.yaml`. This file should already be created as part of the MCP server setup
- Under `data`, add the following
  ```
  secrets:
    - key: CONTENT_AI_CLIENT_ID
      value: ${{CONTENT_AI_CLIENT_ID}}
    - key: CONTENT_AI_CLIENT_SECRET
      value: ${{CONTENT_AI_CLIENT_SECRET}}
    - key: CONTENT_AI_TOKEN_SCOPE
      value: ${{CONTENT_AI_TOKEN_SCOPE}}
    ```