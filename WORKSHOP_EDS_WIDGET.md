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

2. **Option A: Using GitHub (Recommended)**
   - Click "Get Started" on the AEM Live developer tutorial
   - Sign in with your GitHub account
   - Click the "Use this template" button on the boilerplate repository
   - Name your repository (e.g., `my-mcp-widgets`)
   - Install the AEM Code Sync GitHub App to enable automatic synchronization

3. **Option B: Using SharePoint**
   - Follow the SharePoint setup instructions in the tutorial
   - Create a new SharePoint folder for your project
   - Connect it to your AEM project

4. **Verify Your Setup**
   - You should now have:
     - A GitHub repository with the EDS boilerplate code
     - A preview URL (e.g., `https://main--my-mcp-widgets--yourusername.aem.live`)
     - A local development environment (optional but recommended)

### Step 1.2: Test Your EDS Environment

1. **Access Your Live Site**
   ```
   https://main--my-mcp-widgets--yourusername.aem.live
   ```

2. **Make a Test Edit**
   - Edit the `index.md` file in your repository or SharePoint
   - Add some test content:
     ```markdown
     # My MCP Widgets Test
     
     This is a test page to verify my EDS setup is working.
     ```

3. **Preview the Changes**
   - Wait a few seconds for the build to complete
   - Refresh your preview URL
   - You should see your changes reflected

---

## Part 2: AEM Embed Setup

AEM Embed allows you to display EDS content inside non-EDS environments (like widgets).

### Step 2.1: Add the AEM Embed Script

1. **Create the `aem-embed.js` File**
   
   In your EDS project, create a new file at `scripts/aem-embed.js`:

   ```javascript
   /*
    * AEM Embed - Embeds AEM content into any page
    * See: https://www.aem.live/docs/aem-embed
    */
   
   const observedSections = new WeakSet();
   
   /**
    * Load CSS from a given path.
    */
   function loadCSS(href) {
     if (document.querySelector(`head > link[href="${href}"]`)) {
       return;
     }
     const link = document.createElement('link');
     link.rel = 'stylesheet';
     link.href = href;
     document.head.append(link);
   }
   
   /**
    * Forward custom events from iframe to parent
    */
   function forwardCustomEvents(iframe) {
     iframe.contentWindow.addEventListener('message', (e) => {
       if (e.data && e.data.type === 'aem-embed-custom-event') {
         window.dispatchEvent(new CustomEvent(e.data.event, { detail: e.data.detail }));
       }
     });
   }
   
   /**
    * Observer for section loading
    */
   function observeSections(container) {
     const sections = container.querySelectorAll('.section');
     sections.forEach((section) => {
       if (!observedSections.has(section)) {
         observedSections.add(section);
         const observer = new MutationObserver(() => {
           section.dataset.sectionStatus = 'loaded';
         });
         observer.observe(section, { childList: true, subtree: true });
       }
     });
   }
   
   class AEMEmbed extends HTMLElement {
     constructor() {
       super();
       this.attachShadow({ mode: 'open' });
     }
   
     connectedCallback() {
       const url = this.getAttribute('url');
       if (!url) {
         console.error('AEM Embed: url attribute is required');
         return;
       }
   
       // Create iframe
       const iframe = document.createElement('iframe');
       iframe.src = url;
       iframe.style.width = '100%';
       iframe.style.border = 'none';
       iframe.style.display = 'block';
   
       // Auto-resize iframe based on content
       iframe.addEventListener('load', () => {
         forwardCustomEvents(iframe);
         
         const resizeObserver = new ResizeObserver(() => {
           const body = iframe.contentDocument?.body;
           if (body) {
             const height = body.scrollHeight;
             iframe.style.height = `${height}px`;
             observeSections(body);
           }
         });
   
         if (iframe.contentDocument?.body) {
           resizeObserver.observe(iframe.contentDocument.body);
         }
       });
   
       this.shadowRoot.appendChild(iframe);
     }
   }
   
   customElements.define('aem-embed', AEMEmbed);
   ```

2. **Commit and Push**
   ```bash
   git add scripts/aem-embed.js
   git commit -m "Add AEM Embed support"
   git push
   ```

3. **Verify the Script is Available**
   - Wait for the deployment
   - Access: `https://main--my-mcp-widgets--yourusername.aem.live/scripts/aem-embed.js`
   - You should see your JavaScript code

### Step 2.2: Test AEM Embed (Optional)

Create a test page to verify AEM Embed works:

1. **Create `test-embed.html` in your EDS project:**
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

2. **Test it at:**
   ```
   https://main--my-mcp-widgets--yourusername.aem.live/test-embed.html
   ```

---

## Part 3: Create Widget Content in EDS

Now let's create the actual content that will be displayed in your widget.

### Step 3.1: Create the Widget Page

1. **Create a New Document**
   
   In your EDS authoring environment (GitHub/SharePoint), create a new file:
   - Path: `widgets/team-dashboard.md` (or `widgets/team-dashboard` in SharePoint)

2. **Add the Widget Content**

   ```markdown
   # Team Dashboard
   
   ## Current Sprint: Sprint 24
   
   ### Team Velocity
   
   | Metric | Value |
   |--------|-------|
   | Story Points Completed | 34 |
   | Tasks Remaining | 12 |
   | Sprint Progress | 68% |
   
   ### Team Members
   
   - 👤 **Alice Johnson** - Frontend Lead
   - 👤 **Bob Smith** - Backend Developer  
   - 👤 **Carol Davis** - UX Designer
   - 👤 **David Chen** - QA Engineer
   
   ---
   
   ### Quick Actions
   
   - [View Sprint Board](https://example.com/sprint)
   - [Daily Standup Notes](https://example.com/standup)
   - [Team Calendar](https://example.com/calendar)
   ```

3. **Add Custom Styling (Optional)**

   Create `widgets/team-dashboard.css`:
   ```css
   .team-dashboard {
     font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
     max-width: 800px;
     margin: 0 auto;
     padding: 20px;
   }
   
   .team-dashboard h1 {
     color: #1e40af;
     border-bottom: 3px solid #3b82f6;
     padding-bottom: 10px;
   }
   
   .team-dashboard table {
     width: 100%;
     border-collapse: collapse;
     margin: 20px 0;
   }
   
   .team-dashboard table td {
     padding: 12px;
     border: 1px solid #e5e7eb;
   }
   
   .team-dashboard table tr:nth-child(even) {
     background-color: #f9fafb;
   }
   
   .team-dashboard ul {
     list-style: none;
     padding: 0;
   }
   
   .team-dashboard ul li {
     padding: 10px;
     margin: 5px 0;
     background: #eff6ff;
     border-radius: 5px;
   }
   ```

4. **Commit and Verify**
   ```bash
   git add widgets/
   git commit -m "Add team dashboard widget content"
   git push
   ```

5. **Preview Your Widget**
   ```
   https://main--my-mcp-widgets--yourusername.aem.live/widgets/team-dashboard
   ```
   
   You should see your formatted team dashboard content.

---

## Part 4: Create the Action with Widget

Now we'll integrate this EDS content into an action.

### Step 4.1: Generate the Action Scaffold

1. **Navigate to Your Project**
   ```bash
   cd /path/to/mcp-edge-compute-typescript
   ```

2. **Generate the Action with Widget**
   ```bash
   node scripts/generate-action.js teamDashboard --widget
   ```

   This creates:
   ```
   server/src/actions/teamDashboard/
   ├── index.ts                    # Action handler
   └── widget/
       ├── index.ts                # Widget metadata
       └── template.html           # Widget template
   ```

### Step 4.2: Update the Widget Template

1. **Edit `server/src/actions/teamDashboard/widget/template.html`**

   Replace the content with your EDS URLs:
   ```html
   <script src="https://main--my-mcp-widgets--yourusername.aem.live/scripts/aem-embed.js" type="module"></script>
   <div>
       <aem-embed url="https://main--my-mcp-widgets--yourusername.aem.live/widgets/team-dashboard"></aem-embed>
   </div>
   ```

   **Important:** Replace `yourusername` and `my-mcp-widgets` with your actual GitHub username and repository name.

### Step 4.3: Update the Widget Metadata

1. **Edit `server/src/actions/teamDashboard/widget/index.ts`**

   Customize the widget metadata:
   ```typescript
   export const widgetMeta = {
       uri: "ui://aem-widget/team-dashboard-widget.html",
       name: "teamDashboardWidget",
       description: "Team Dashboard widget showing sprint progress and team members",
       mimeType: "text/html+skybridge",
       htmlFile: "template.html",
       _meta: {
         "openai/widgetPrefersBorder": true,
         "openai/widgetDescription": "Displays team dashboard with sprint metrics and team member information",
       }
     };
   ```

### Step 4.4: Update the Action Handler

1. **Edit `server/src/actions/teamDashboard/index.ts`**

   Customize the action definition:
   ```typescript
   const teamDashboard: Action = {
     version: '0.0.1',
     name: "teamDashboard",
     isPublished: true,
     hasAemWidget: true,
     definition: {
       title: "Team Dashboard",
       description: "Displays the current team dashboard with sprint progress, team members, and quick actions",
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
         "openai/toolInvocation/invoking": "Loading team dashboard",
         "openai/toolInvocation/invoked": "Team dashboard loaded",
         "openai/widgetAccessible": true,
         "openai/resultCanProduceWidget": true,
       },
     },
     handler: async (args: {}): Promise<ActionHandlerResult> => {
       const startTime = Date.now();
       logger.info('MCP: action=tool_invoked;tool=teamDashboard;status=starting');

       try {
         logger.info('MCP: action=tool_execution;tool=teamDashboard;status=processing');

         const now = new Date();
         const responseText = `Team dashboard loaded successfully at ${now.toISOString()}`;

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
         logger.info(`MCP: action=tool_completed;tool=teamDashboard;status=success;duration_ms=${executionTime}`);

         return result;
       } catch (error: any) {
         const executionTime = Date.now() - startTime;
         logger.error(`MCP: action=tool_completed;tool=teamDashboard;status=error;duration_ms=${executionTime};error=${error.message}`);

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

   export default teamDashboard;
   ```

### Step 4.5: Register the Action

1. **Generate the Action Index**
   ```bash
   make generate-actions
   ```

   This automatically registers your new action in `server/src/actions/index.ts` and `server/src/actions/index-widgets.ts`.

2. **Verify the Registration**
   ```bash
   grep -r "teamDashboard" server/src/actions/index.ts
   ```

   You should see your action imported and exported.

---

## Part 5: Build and Test

### Step 5.1: Build the Project

1. **Install Dependencies** (if not already done)
   ```bash
   npm install
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

   Create `tests/actions/teamDashboard.test.ts`:
   ```typescript
   import { describe, expect, it } from '@jest/globals';
   import teamDashboard from '../../server/src/actions/teamDashboard';

   describe('teamDashboard action', () => {
     it('should return success with team dashboard data', async () => {
       const result = await teamDashboard.handler({});
       
       expect(result.success).toBe(true);
       expect(result.content).toBeDefined();
       expect(result.content[0].type).toBe('text');
       expect(result.structuredContent).toHaveProperty('sprint');
       expect(result.structuredContent).toHaveProperty('velocity');
     });

     it('should include timestamp', async () => {
       const result = await teamDashboard.handler({});
       
       expect(result.timestamp).toBeDefined();
       expect(typeof result.timestamp).toBe('number');
     });
   });
   ```

3. **Run Your Test**
   ```bash
   npm test -- teamDashboard
   ```

### Step 5.3: Local Development Testing

1. **Start the Local Server** (if supported)
   ```bash
   make dev
   ```

2. **Test the Action**
   - Use your client (ChatGPT, Claude, etc.)
   - Invoke the action: "Show me the team dashboard"
   - Verify the widget displays correctly with your EDS content

---

## Part 6: Deploy and Verify

### Step 6.1: Deploy to Fastly

1. **Deploy the Service**
   ```bash
   make deploy
   ```

2. **Verify Deployment**
   - Check that the deployment succeeded
   - Note your service URL

### Step 6.2: Test in Production

1. **Configure Your Client**
   - Update the server URL to your deployed service
   - Restart your client

2. **Test the Action**
   ```
   User: "Show me the team dashboard"
   ```

   The AI should:
   - Invoke your `teamDashboard` action
   - Display the widget with your EDS content
   - Show the team information in a nicely formatted view

---

## Troubleshooting

### Widget Not Displaying

**Problem:** The widget shows as blank or doesn't load.

**Solutions:**
1. Check browser console for errors
2. Verify EDS URL is accessible: `https://main--my-mcp-widgets--yourusername.aem.live/widgets/team-dashboard`
3. Verify AEM Embed script is loading: `https://main--my-mcp-widgets--yourusername.aem.live/scripts/aem-embed.js`
4. Check for CORS issues (EDS should handle this automatically)

### Action Not Appearing

**Problem:** The AI doesn't recognize your action.

**Solutions:**
1. Verify you ran `make generate-actions`
2. Check `server/src/actions/index.ts` includes your action
3. Rebuild the project: `make build`
4. Restart your client

### TypeScript Errors

**Problem:** Build fails with TypeScript errors.

**Solutions:**
1. Check that all imports are correct
2. Verify the action structure matches the `Action` type
3. Ensure `z` (Zod) is imported for schema validation
4. Run `npm install` to ensure all dependencies are present

### EDS Content Not Updating

**Problem:** Changes to EDS content don't appear in the widget.

**Solutions:**
1. Clear browser cache
2. Wait a few minutes for EDS to rebuild
3. Check the preview URL directly to verify content is published
4. Try adding a cache-busting parameter: `?v=2`

---

## Advanced Topics

### Adding Dynamic Data to Widgets

You can pass data from your action handler to the widget through `structuredContent`:

```typescript
const result = {
  content: [{
    type: "text" as const,
    text: responseText
  }],
  structuredContent: {
    teamName: "Engineering Team Alpha",
    sprint: sprintNumber,
    members: teamMembers,
    // This data can be consumed by the widget
  },
  success: true,
  timestamp: now.getTime()
};
```

### Adding Input Parameters

To make your action accept parameters:

```typescript
inputSchema: z.object({
  teamId: z.string().describe("The ID of the team to display"),
  sprintNumber: z.number().optional().describe("Specific sprint number to show"),
}),
```

Then use these in your handler:

```typescript
handler: async (args: { teamId: string; sprintNumber?: number }): Promise<ActionHandlerResult> => {
  const { teamId, sprintNumber } = args;
  // Use teamId to fetch team-specific data
}
```

### Creating Dynamic EDS Pages

You can create parameterized EDS pages:
1. Create a base template in EDS
2. Use query parameters to pass data
3. Use EDS JavaScript to dynamically populate content
4. Example: `https://main--my-mcp-widgets--yourusername.aem.live/widgets/team-dashboard?teamId=123`

---

## Best Practices

### Security
- ✅ Never expose sensitive data in widgets
- ✅ Validate all input parameters using Zod schemas
- ✅ Use read-only actions when possible (`readOnlyHint: true`)
- ✅ Follow the principle of least privilege

### Performance
- ✅ Keep widget HTML minimal and efficient
- ✅ Use EDS caching effectively
- ✅ Avoid loading large assets in widgets
- ✅ Test widget load times

### User Experience
- ✅ Provide clear descriptions for actions
- ✅ Use meaningful widget titles and descriptions
- ✅ Design responsive widgets that work on different screen sizes
- ✅ Include error states in your widgets

### Maintainability
- ✅ Use descriptive naming conventions
- ✅ Comment complex logic
- ✅ Write tests for your actions
- ✅ Keep widget content separate from logic
- ✅ Version your actions (`version: '0.0.1'`)

---

## Workshop Exercise

Now that you've learned the basics, try creating your own widget:

### Exercise: Weather Dashboard Widget

Create an action that displays a weather dashboard:

1. **EDS Content** (`widgets/weather-dashboard.md`):
   - Current temperature
   - Weather condition (sunny, cloudy, etc.)
   - 5-day forecast table
   - Weather alerts section

2. **Action**: `weatherDashboard`
   - Optional input: `location` (city name)
   - Returns weather data
   - Displays in widget

3. **Bonus Challenges**:
   - Add custom CSS for weather icons
   - Make the widget responsive
   - Add real-time data integration
   - Include interactive elements (click to see more details)

---

## Resources

### Documentation
- [AEM Edge Delivery Services](https://www.aem.live/developer/tutorial)
- [AEM Embed Documentation](https://www.aem.live/docs/aem-embed)
- [Zod Schema Validation](https://zod.dev/)

### Example Projects
- [Sample EDS Widgets](https://github.com/LucianRadu/chatgpt-eds)

### Getting Help
- Check the project README: `README.md`
- Review existing actions: `server/src/actions/`
- Refer to the widget guide: `server/src/widgets/README.md`
- Ask questions in the workshop chat

---

## Conclusion

Congratulations! You've learned how to:
- ✅ Set up an EDS environment from scratch
- ✅ Configure AEM Embed for content integration
- ✅ Create rich content in EDS
- ✅ Build an MCP action with widget support
- ✅ Deploy and test your solution

This architecture allows you to:
- Author content visually in EDS
- Leverage EDS's performance and caching
- Create rich, interactive widgets for AI assistants
- Maintain separation between content and logic
- Scale efficiently with edge computing

**Next Steps:**
- Explore more complex widgets
- Integrate with real data sources
- Create reusable widget templates
- Share your widgets with the team

Happy coding! 🚀

