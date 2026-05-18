# Frontend Architecture Plan
## Agentic AI Digital Marketing OS

---

## 1. TECHNOLOGY STACK

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.x (App Router) | Framework, SSR, routing |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | Latest | Base component system |
| Zustand | 4.x | Client state management |
| TanStack Query | 5.x | Server state, caching |
| React Flow | 11.x | Visual workflow builder |
| Recharts | 2.x | Analytics charts |
| Framer Motion | 10.x | Animations |
| Socket.io-client | 4.x | WebSocket connections |
| Zod | 3.x | Schema validation |
| date-fns | 3.x | Date utilities |

---

## 2. PROJECT STRUCTURE

```
frontend/
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← Root layout (fonts, providers)
│   ├── globals.css                   ← Global styles
│   │
│   ├── (auth)/                       ← Auth route group (no sidebar)
│   │   ├── layout.tsx                ← Auth shell (centered card)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/                  ← Dashboard route group
│   │   ├── layout.tsx                ← Sidebar + header shell
│   │   ├── page.tsx                  ← Overview dashboard
│   │   │
│   │   ├── agents/
│   │   │   ├── page.tsx              ← Agent list + status
│   │   │   └── [agentId]/
│   │   │       ├── page.tsx          ← Agent detail + logs
│   │   │       └── executions/
│   │   │           └── [execId]/
│   │   │               └── page.tsx  ← Execution trace viewer
│   │   │
│   │   ├── workflows/
│   │   │   ├── page.tsx              ← Workflow library
│   │   │   ├── new/
│   │   │   │   └── page.tsx          ← Visual workflow builder
│   │   │   └── [workflowId]/
│   │   │       ├── page.tsx          ← Workflow detail + runs
│   │   │       └── builder/
│   │   │           └── page.tsx      ← Edit workflow
│   │   │
│   │   ├── campaigns/
│   │   │   ├── page.tsx              ← Campaign overview
│   │   │   └── [campaignId]/
│   │   │       └── page.tsx          ← Campaign detail
│   │   │
│   │   ├── content/
│   │   │   ├── page.tsx              ← Content hub
│   │   │   └── [contentId]/
│   │   │       └── page.tsx          ← Content editor/viewer
│   │   │
│   │   ├── approvals/
│   │   │   ├── page.tsx              ← Approval queue (inbox-style)
│   │   │   └── [approvalId]/
│   │   │       └── page.tsx          ← Individual approval review
│   │   │
│   │   ├── analytics/
│   │   │   ├── page.tsx              ← Main analytics dashboard
│   │   │   ├── campaigns/
│   │   │   │   └── page.tsx          ← Campaign performance
│   │   │   └── agents/
│   │   │       └── page.tsx          ← Agent performance metrics
│   │   │
│   │   └── settings/
│   │       ├── page.tsx              ← General settings
│   │       ├── team/
│   │       │   └── page.tsx          ← Team management + RBAC
│   │       ├── integrations/
│   │       │   └── page.tsx          ← Platform connections
│   │       └── billing/
│   │           └── page.tsx          ← Plan + usage
│   │
│   └── api/                          ← Next.js API routes (BFF)
│       ├── auth/
│       └── [...proxy]/               ← Proxy to backend services
│
├── components/
│   ├── ui/                           ← shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx               ← Main navigation sidebar
│   │   ├── Header.tsx                ← Top header bar
│   │   ├── PageHeader.tsx            ← Page title + actions
│   │   └── NotificationBell.tsx      ← Real-time notifications
│   │
│   ├── agents/
│   │   ├── AgentCard.tsx             ← Agent status card
│   │   ├── AgentGrid.tsx             ← Grid of agent cards
│   │   ├── AgentExecutionLog.tsx     ← Real-time log stream
│   │   ├── AgentStatusBadge.tsx      ← Running/idle/error badge
│   │   └── AgentConfidenceBar.tsx    ← Visual confidence score
│   │
│   ├── workflows/
│   │   ├── WorkflowCanvas.tsx        ← React Flow canvas
│   │   ├── WorkflowNode.tsx          ← Custom React Flow nodes
│   │   ├── WorkflowSidebar.tsx       ← Node palette
│   │   ├── WorkflowTimeline.tsx      ← Execution timeline
│   │   └── WorkflowRunCard.tsx       ← Past run summary card
│   │
│   ├── approvals/
│   │   ├── ApprovalInbox.tsx         ← Queue with filters
│   │   ├── ApprovalCard.tsx          ← Preview card in queue
│   │   ├── ApprovalReview.tsx        ← Full review panel
│   │   ├── ContentDiffViewer.tsx     ← Show AI vs human edit
│   │   └── ConfidenceIndicator.tsx   ← AI confidence visualization
│   │
│   ├── analytics/
│   │   ├── KPICard.tsx               ← Single metric card
│   │   ├── KPIGrid.tsx               ← Grid of KPI cards
│   │   ├── CampaignChart.tsx         ← Campaign performance chart
│   │   ├── AgentROIChart.tsx         ← Agent value chart
│   │   ├── TokenUsageChart.tsx       ← AI usage tracking
│   │   └── TrendBadge.tsx            ← Up/down trend indicator
│   │
│   └── shared/
│       ├── EmptyState.tsx            ← No data placeholder
│       ├── LoadingSpinner.tsx
│       ├── ConfirmDialog.tsx
│       ├── TenantPicker.tsx          ← Multi-tenant switcher
│       └── PlanBadge.tsx             ← Starter/Pro/Enterprise badge
│
├── store/
│   ├── authStore.ts                  ← User + session state
│   ├── tenantStore.ts                ← Current tenant context
│   ├── agentStore.ts                 ← Agent statuses (real-time)
│   ├── workflowStore.ts              ← Workflow builder state
│   ├── approvalStore.ts              ← Pending approvals count
│   └── notificationStore.ts         ← Toast + notification queue
│
├── hooks/
│   ├── useWebSocket.ts               ← WebSocket connection manager
│   ├── useAgentStream.ts             ← Stream agent execution logs
│   ├── useApprovals.ts               ← TanStack Query for approvals
│   ├── useWorkflows.ts               ← Workflow CRUD + execution
│   ├── useAnalytics.ts               ← Analytics data fetching
│   └── useRealTimeUpdates.ts         ← Subscribe to live updates
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 ← Typed API client (base)
│   │   ├── agents.ts                 ← Agent API calls
│   │   ├── workflows.ts              ← Workflow API calls
│   │   ├── approvals.ts              ← Approval API calls
│   │   └── analytics.ts             ← Analytics API calls
│   ├── ws.ts                         ← WebSocket manager class
│   └── utils.ts                      ← Shared utilities
│
└── types/
    ├── agent.ts                      ← Agent types
    ├── workflow.ts                   ← Workflow types
    ├── approval.ts                   ← Approval types
    └── analytics.ts                  ← Analytics types
```

---

## 3. KEY SCREENS SPECIFICATION

### Screen 1: Dashboard Overview

```
┌────────────────────────────────────────────────────────────┐
│  KPI Cards Row: [Campaigns Running] [Content Created Today] │
│               [Pending Approvals]  [AI Time Saved]          │
├────────────────────────────────────────────────────────────┤
│  Active Workflows (real-time status bars)                   │
│  ┌─────────────────────────┐ ┌─────────────────────────┐  │
│  │ Weekly Content Calendar │ │ SEO Audit — Acme Corp   │  │
│  │ ████████░░░░ 65%        │ │ ██░░░░░░░░░░ 18%        │  │
│  │ 🟢 Content Agent writing│ │ 🟡 Awaiting approval    │  │
│  └─────────────────────────┘ └─────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  Approval Inbox (3 pending) [View All →]                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🟡 Blog Post: "10 Ways to..." — HIGH confidence (91%)│  │
│  │ 🟠 Ad Campaign Structure — MEDIUM confidence (73%)   │  │
│  │ 🔴 Marketing Strategy — LOW confidence (58%)         │  │
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  Agent Activity Feed (real-time)                            │
│  • Content Agent — Generated 3 blog posts (2 min ago)      │
│  • SEO Agent — Keyword research complete (8 min ago)        │
│  • Research Agent — Competitor analysis done (15 min ago)   │
└────────────────────────────────────────────────────────────┘
```

### Screen 2: Workflow Builder

```
┌──────────┬────────────────────────────────────┬────────────┐
│ PALETTE  │         CANVAS                      │ CONFIG     │
│          │                                     │            │
│ Triggers │  [Schedule] ──→ [Research] ──┐      │ Node: Agent│
│ ─────── │                              ▼      │            │
│ ⏰ Cron  │                [Strategy] ──→ [✓]   │ Agent:     │
│ 🔔 Event │                                     │ content_ag │
│ 🔗 Webhook              ┌──────────────────┐   │            │
│          │              │ Approval Gate    │   │ Task:      │
│ Agents   │              │ Role: Mktg Mgr   │   │ [text area]│
│ ─────── │              │ Timeout: 24hr    │   │            │
│ 🤖 Strategy             └──────────────────┘   │ Inputs:    │
│ 🤖 SEO   │                                     │ [form]     │
│ 🤖 Content              [Content x3] → [Notify]│            │
│ 🤖 Ads   │                                     │ [Save Node]│
└──────────┴────────────────────────────────────┴────────────┘
```

### Screen 3: Approval Review

```
┌────────────────────────────────────────────────────────────┐
│ Approval: Marketing Strategy — Q1 2025          [3 of 12]  │
│ Agent: Strategy Agent  │  Confidence: 73% ████████░░       │
├──────────────────────────────────────────────────────────  │
│ AI Reasoning Summary:                                       │
│ "Based on the SaaS business model and 6-month growth goal   │
│  of 40% MRR, I recommend focusing on content-led SEO and   │
│  LinkedIn outreach. Confidence moderate due to limited      │
│  competitor data in provided context."                      │
├─────────────────────────────┬──────────────────────────────│
│ AI OUTPUT (read-only)       │ YOUR EDIT (editable)         │
│                             │                              │
│ Channel Priority:           │ Channel Priority:            │
│ 1. Content/SEO (40%)        │ 1. Content/SEO (35%)         │
│ 2. LinkedIn Ads (30%)       │ 2. LinkedIn Ads (25%)        │
│ 3. Email Nurture (20%)      │ 3. Email Nurture (30%)       │
│ 4. Cold Outreach (10%)      │ 4. Cold Outreach (10%)       │
│                             │                 ← CHANGED    │
├────────────────────────────────────────────────────────────│
│ [✓ Approve] [✗ Reject] [↩ Revision Notes] [→ Escalate]    │
└────────────────────────────────────────────────────────────┘
```

### Screen 4: Agent Monitor

```
┌────────────────────────────────────────────────────────────┐
│ AGENTS                    Filter: [All ▼] [Running ▼]      │
├──────────────────┬──────────────────┬──────────────────────┤
│ Strategy Agent   │ SEO Agent        │ Content Agent        │
│ 🟢 IDLE          │ 🔵 RUNNING       │ 🟢 IDLE              │
│ 0/20 instances   │ 3/20 instances   │ 0/20 instances       │
│ Avg confidence   │ Current task:    │ Last run: 10min ago  │
│ 87% ↑ 3%        │ "Keyword audit   │ 5 pieces created     │
│ Tokens today:    │  for TechCorp"   │ 94% approval rate    │
│ 24k / 200k      │ Tokens: 12k      │ Tokens today: 67k    │
└──────────────────┴──────────────────┴──────────────────────┘
│ LIVE EXECUTION LOG                                          │
│ [SEO Agent] 10:42:15 — Searching: "SaaS SEO benchmarks"   │
│ [SEO Agent] 10:42:18 — Found 847 results, filtering...     │
│ [SEO Agent] 10:42:22 — Analyzing top 20 keyword gaps       │
│ [SEO Agent] 10:42:35 — Generating recommendations...       │
└────────────────────────────────────────────────────────────┘
```

---

## 4. STATE MANAGEMENT

```typescript
// store/agentStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed' | 'waiting_approval';
  confidence: number;
  tokensUsed: number;
  logs: LogEntry[];
  startedAt: string;
}

interface AgentStore {
  executions: Record<string, AgentExecution>;
  activeCount: number;
  
  // Actions
  upsertExecution: (execution: AgentExecution) => void;
  appendLog: (executionId: string, log: LogEntry) => void;
  updateStatus: (executionId: string, status: AgentExecution['status']) => void;
  clearCompleted: () => void;
}

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set, get) => ({
    executions: {},
    activeCount: 0,
    
    upsertExecution: (execution) => set((state) => ({
      executions: { ...state.executions, [execution.id]: execution },
      activeCount: Object.values(state.executions)
        .filter(e => e.status === 'running').length
    })),
    
    appendLog: (executionId, log) => set((state) => ({
      executions: {
        ...state.executions,
        [executionId]: {
          ...state.executions[executionId],
          logs: [...(state.executions[executionId]?.logs ?? []), log]
        }
      }
    })),
    
    updateStatus: (executionId, status) => set((state) => ({
      executions: {
        ...state.executions,
        [executionId]: { ...state.executions[executionId], status }
      }
    })),
    
    clearCompleted: () => set((state) => ({
      executions: Object.fromEntries(
        Object.entries(state.executions)
          .filter(([, e]) => e.status === 'running')
      )
    }))
  }))
);
```

---

## 5. REAL-TIME WEBSOCKET ARCHITECTURE

```typescript
// lib/ws.ts
class WebSocketManager {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  
  connect(token: string, tenantId: string) {
    this.socket = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/ws?token=${token}&tenant=${tenantId}`
    );
    
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('[WS] Connected');
    };
    
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.dispatch(message.type, message.data);
    };
    
    this.socket.onclose = () => {
      // Exponential backoff reconnect
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(token, tenantId), delay);
    };
  }
  
  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)!.delete(handler);
  }
  
  private dispatch(event: string, data: unknown) {
    this.handlers.get(event)?.forEach(h => h(data));
    this.handlers.get('*')?.forEach(h => h({ event, data }));
  }
}

// Event types from backend
type WSEvent =
  | { type: 'agent.started'; data: { executionId: string; agentId: string } }
  | { type: 'agent.log'; data: { executionId: string; log: LogEntry } }
  | { type: 'agent.completed'; data: { executionId: string; confidence: number } }
  | { type: 'approval.created'; data: { approvalId: string; type: string } }
  | { type: 'workflow.status'; data: { workflowId: string; status: string } }
  | { type: 'notification'; data: { message: string; severity: 'info' | 'warning' | 'error' } };
```

---

## 6. API CLIENT

```typescript
// lib/api/client.ts
class APIClient {
  private baseUrl: string;
  private getToken: () => string;
  private tenantId: string;
  
  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
        'X-Tenant-ID': this.tenantId,
        'X-Request-ID': crypto.randomUUID()
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error.code, error.error.message, response.status);
    }
    
    const envelope: APIResponse<T> = await response.json();
    return envelope.data!;
  }
  
  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown) { return this.request<T>('POST', path, body); }
  put<T>(path: string, body: unknown) { return this.request<T>('PUT', path, body); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}

// lib/api/approvals.ts
export const approvalApi = {
  list: (status?: string) => 
    client.get<ApprovalRequest[]>(`/approvals?status=${status ?? 'pending'}`),
  
  get: (id: string) => 
    client.get<ApprovalRequest>(`/approvals/${id}`),
  
  approve: (id: string, edits?: Partial<ApprovalContent>) => 
    client.post(`/approvals/${id}/approve`, { edits }),
  
  reject: (id: string, reason: string) => 
    client.post(`/approvals/${id}/reject`, { reason }),
  
  requestRevision: (id: string, notes: string) => 
    client.post(`/approvals/${id}/revision`, { notes })
};
```

---

## 7. NOTIFICATIONS SYSTEM

```typescript
// store/notificationStore.ts
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; href: string };
  persistent?: boolean;
  createdAt: number;
}

// Types of notifications:
// - "Approval required: Marketing Strategy" (persistent, with link)
// - "Content Agent completed 5 blog posts" (auto-dismiss 5s)
// - "Workflow failed: Weekly Content Calendar" (persistent, error)
// - "AI credit balance low: 15% remaining" (warning, persistent)
```

---

*Frontend Architecture Plan v1.0*