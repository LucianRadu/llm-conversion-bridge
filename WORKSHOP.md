# ChatGPT Apps tutorial with LLM Conversion Bridge

## Introduction

This tutorial introduces you to the **LLM Conversion Bridge**, a powerful framework for building ChatGPT applications leveraging familiar technologies like AEM EDS and MCP.

## What You'll Build

You'll create a "Hello BMW" action that displays a BMW branded sample message.

## Part 1: EDS Environment Setup

### Step 1.1: Create Your EDS Project

1. **Navigate to the EDS Tutorial**
   - Go to https://www.aem.live/developer/tutorial
   - This will guide you through the complete EDS setup or create one new EDS site from Cloud Manager - https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/using-cloud-manager/edge-delivery-sites/create-edge-delivery-site
   - IMPORTANT: use the following, updated `aem-embed.js`: https://github.com/LucianRadu/chatgpt-eds/blob/main/scripts/aem-embed.js


2. **Verify Your Setup**
   - You should now have:
     - A GitHub repository with the EDS boilerplate code
     - A preview URL (e.g., `https://main--my-aem-widgets--yourusername.aem.live`)
     - A local development environment (optional but recommended)

### Step 1.2: Test Your EDS Environment

1. **Access Your Live Site**
   ```
   https://main--my-aem-widgets--yourusername.aem.live
   ```

2. **Preview the Changes**
   - Wait a few seconds for the build to complete
   - Refresh your preview URL
   - You should see your changes reflected

---

## Part 2: Setup CORS
Navigate to https://labs.aem.live/tools/headers-edit/index.html. Make sure you are signed in.
Select your organization and repo.
Click `Fetch`.
Add the following header:
```access-control-allow-origin: *```
Click Save.

## Part 3: AEM Embed Setup

AEM Embed allows you to display EDS content inside non-EDS environments (like widgets to display in chatgpt user conversations).

### Step 3.1: Add the AEM Embed Script

1. **Checkout the example setup commit**
   Follow the sample commit: https://github.com/LucianRadu/chatgpt-eds/commit/3ca34d66958bac8c2e4a4bda08930f1e7bb817f5

   

2. **Commit and Push**
  Commit and push your changes

3. **Verify the Script is Available**
   - Wait for the deployment
   - Access: `https://main--my-aem-widgets--yourusername.aem.live/scripts/aem-embed.js`
   - You should see your JavaScript code

### Step 3.2: Test AEM Embed (Optional)

Create a test page to verify AEM Embed works:

1. **Create `test-embed.html` in your local EDS project:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>AEM Embed Test</title>
   </head>
   <body>
       <h1>Testing AEM Embed</h1>
       <script src="/scripts/aem-embed.js" type="module"></script>
       <aem-embed url="/"></aem-embed>
   </body>
   </html>
   ```
2. **Start local server**
   ```bash
   npm install
   aem up
   ```
3. **Test it at:**
   ```
   https://localhost:3000/test-embed.html
   ```

---

## Part 4: Create Widget Content in EDS

Now let's create the actual content that will be displayed in your widget.

### Step 4.1: Create the Widget Page

1. **Create a New Document**
   
   In your EDS authoring environment (https://da.live/#/organization/repository) , create a new file:
   - Path: `widgets/bmw-hello` 

2. **Add the Widget Content**

    For this application, the content can be a sample text with a logo.

3. **Preview and Publish**

4. **Create an EDS block for hello-workshop**

   Under `/blocks` create:
   - `/blocks/bmw-hello/bmw-hello.js`
   - `/blocks/bmw-hello/bmw-hello.css`

Add the following in `/blocks/bmw-hello/bmw-hello.js`

```javascript
export default async function decorate(block, onDataLoaded) {
  block.textContent = 'Content loading...';
  onDataLoaded.then((data) => {
    // eslint-disable-next-line no-console
    console.log('Data loaded', data);
    block.textContent = 'Data loaded';
  });
}

```

5. **Commit and Verify**
   ```bash
   git add .
   git commit -m "Add widget content"
   git push
   ```

6. **Preview Your Widget**
   ```
   https://main--my-aem-widgets--yourusername.aem.live/widgets/bmw-hello
   ```