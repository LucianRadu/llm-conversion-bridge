# Workshop: Creating an Action with an EDS Widget

## Overview

Learn how to create a custom action that displays content using an AEM Edge Delivery Services (EDS) widget. By the end of this workshop, you'll have a fully functional action that can be invoked by AI assistants to display rich, interactive content.

## What You'll Build

You'll create a "Team Dashboard" action that displays team information in a beautifully styled widget. The widget will be authored in EDS and embedded into the action server.

---

## Part 1: EDS Environment Setup

### Step 1.1: Create Your EDS Project

1. **Navigate to the EDS Tutorial**
   - Go to https://www.aem.live/developer/tutorial
   - This will guide you through the complete EDS setup

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

AEM Embed allows you to display EDS content inside non-EDS environments (like widgets).

### Step 2.1: Add the AEM Embed Script

1. **Checkout the example setup commit**
   Follow the sample commit: https://github.com/LucianRadu/chatgpt-eds/commit/3ca34d66958bac8c2e4a4bda08930f1e7bb817f5

   

2. **Commit and Push**
  Commit and push your changes

3. **Verify the Script is Available**
   - Wait for the deployment
   - Access: `https://main--my-aem-widgets--yourusername.aem.live/scripts/aem-embed.js`
   - You should see your JavaScript code

### Step 2.2: Test AEM Embed (Optional)

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

### Step 3.1: Create the Widget Page

1. **Create a New Document**
   
   In your EDS authoring environment (https://da.live/#/organization/repository) , create a new file:
   - Path: `widgets/hello-workshop` 

2. **Add the Widget Content**
![image](./image.png)

3. **Preview and Publish**

4. **Create an EDS block for hello-workshop**

   Under `/blocks` create:
   - `/blocks/hello-workshop/hello-workshop.js`
   - `/blocks/hello-workshop/hello-workshop.css`

Add the following in `/blocks/hello-workshop/hello-workshop.js`

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
   https://main--my-aem-widgets--yourusername.aem.live/widgets/hello-workshop
   ```
  

---

## Part 4: Create the Action with Widget

Now we'll integrate this EDS content into an action.

### Step 4.1: Generate the Action Scaffold

1. **Navigate to Your Project**
   ```bash
   cd /path/to/llm-conversion-bridge
   ```

2. **Generate the Action with Widget**
   ```bash
   make create-action NAME=helloWorkshop WIDGET=true
   ```

   This creates:
   ```
   server/src/actions/helloWorkshop/
   ├── index.ts                    # Action handler
   └── widget/
       ├── index.ts                # Widget metadata
       └── template.html           # Widget template
   ```

### Step 4.2: Update the Widget Template

1. **Edit `server/src/actions/helloWorkshop/widget/template.html`**

   Replace the content with your EDS URLs:
   ```html
   <script src="https://main--my-aem-widgets--yourusername.aem.live/scripts/aem-embed.js" type="module"></script>
   <div>
       <aem-embed url="https://main--my-aem-widgets--yourusername.aem.live/widgets/hello-workshop"></aem-embed>
   </div>
   ```

   **Important:** Replace `yourusername` and `my-aem-widgets` with your actual GitHub username and repository name.

### Step 4.3: Update the Widget Metadata

1. **Edit `server/src/actions/helloWorkshop/widget/index.ts`**

   Customize the widget metadata:
   ```typescript
   export const widgetMeta = {
       uri: "ui://aem-widget/hello-workshop-widget.html",
       name: "helloWorkshopWidget",
       description: "Sample widget",
       mimeType: "text/html+skybridge",
       htmlFile: "template.html",
       _meta: {
         "openai/widgetPrefersBorder": true,
         "openai/widgetDescription": "Displays team dashboard with sprint metrics and team member information",
       }
     };
   ```

### Step 4.4: Update the Action Handler

1. **Edit `server/src/actions/helloWorkshop/index.ts`**

   Customize the action definition:
   ```typescript
   const helloWorkshop: Action = {
     version: '0.0.1',
     name: "helloWorkshop",
     isPublished: true,
     hasAemWidget: true,
     definition: {
       title: "Hello Workshop",
       description: "This is a sample action",
       inputSchema: z.object({
         // No input parameters needed for this example
       }),
       annotations: {
         destructiveHint: false,
         openWorldHint: false,
         readOnlyHint: true,
       },
       _meta: {
         "openai/outputTemplate": "ui://aem-widget/team-dashboard-widget.html",
         "openai/toolInvocation/invoking": "Saying hello...",
         "openai/toolInvocation/invoked": "Said hello",
         "openai/widgetAccessible": true,
         "openai/resultCanProduceWidget": true,
       },
     },
     handler: async (args: {}): Promise<ActionHandlerResult> => {
       const startTime = Date.now();

       try {

         const now = new Date();
         const responseText = `Said hello successfully at ${now.toISOString()}`;

         const result = {
           content: [{
             type: "text" as const,
             text: responseText
           }],
           structuredContent: {
             sprint: "Sprint 24",
             velocity: 34,
             tasksRemaining: 12,
             progress: 68
           },
           success: true,
           timestamp: now.getTime()
         };

         const executionTime = Date.now() - startTime;

         return result;
       } catch (error: any) {
         const executionTime = Date.now() - startTime;

         return {
           content: [{
             type: "text" as const,
             text: `Error loading team dashboard: ${error.message}`
           }],
           success: false,
           error: error.message,
           timestamp: Date.now()
         };
       }
     }
   };

   export default helloWorkshop;
   ```

---

## Part 5: Build and Test

### Step 5.1: Build the Project

1. **Install Dependencies** (if not already done)
   ```bash
   make setup
   ```

2. **Build the Project**
   ```bash
   make build
   ```

   This will:
   - Compile TypeScript
   - Generate action indices
   - Generate widget indices with embedded HTML
   - Create the WebAssembly package

3. **Check for Errors**
   - If you see any TypeScript errors, review your code
   - Common issues:
     - Missing imports
     - Incorrect type definitions
     - Syntax errors in the action handler

### Step 5.2: Run Tests

1. **Run the Test Suite**
   ```bash
   make test
   ```

2. **Create a Custom Test** (Optional)

   Create `tests/actions/helloWorkshop.test.ts`:
   ```typescript
   import { describe, expect, it } from '@jest/globals';
   import helloWorkshop from '../../server/src/actions/helloWorkshop';

   describe('helloWorkshop action', () => {
     it('should return success with team dashboard data', async () => {
       const result = await helloWorkshop.handler({});
       
       expect(result.success).toBe(true);
       expect(result.content).toBeDefined();
       expect(result.content[0].type).toBe('text');
       expect(result.structuredContent).toHaveProperty('sprint');
       expect(result.structuredContent).toHaveProperty('velocity');
     });

     it('should include timestamp', async () => {
       const result = await helloWorkshop.handler({});
       
       expect(result.timestamp).toBeDefined();
       expect(typeof result.timestamp).toBe('number');
     });
   });
   ```

3. **Run Your Test**
   ```bash
   npm test -- helloWorkshop
   ```

### Step 5.3: Local Development Testing

1. **Start the Local Server** (if supported)
   ```bash
   make serve
   ```

2. **Test the Action**
   - Use your client (ChatGPT, Claude, etc.)
   - Invoke the action: "Show me the team dashboard"
   - Verify the widget displays correctly with your EDS content

---

## Part 6: Deploy and Verify

### Step 6.1: Deploy to Fastly
1. Setup credentials
 ```bash
export AEM_COMPUTE_TOKEN=<your_token>
export AEM_COMPUTE_SERVICE=<your_service_id>
```  

2. **Deploy the Service**
   ```bash
   make deploy
   ```

3. **Verify Deployment**
   - Check that the deployment succeeded
   - Note your service URL

### Step 6.2: Test in Production

1. **Configure Your Client**
   - Update the server URL to your deployed service
   - Restart your client

2. **Test the Action**
   ```
   User: "Say hello"
   ```

   The AI should:
   - Invoke your `helloWorkshop` action
   - Display the widget with your EDS content
   - Show the team information in a nicely formatted view

---
