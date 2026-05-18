# Workflow Engine Design
## Agentic AI Digital Marketing OS

---

## WHY TEMPORAL

Temporal was chosen over alternatives (Celery chains, Airflow, Prefect) for these reasons:

| Requirement | Celery Chains | Airflow | Temporal |
|-------------|--------------|---------|----------|
| Durable execution (survives crashes) | ✗ | Partial | ✓ |
| Long-running workflows (days/weeks) | ✗ | ✓ | ✓ |
| Workflow versioning (safe upgrades) | ✗ | ✗ | ✓ |
| Human-in-the-loop signals | ✗ | ✗ | ✓ |
| Sub-workflow spawning | Partial | ✓ | ✓ |
| Built-in retry with backoff | Partial | ✓ | ✓ |
| Code-first (Python) | ✓ | DAG YAML | ✓ |
| Audit timeline visualization | ✗ | Partial | ✓ |

---

## WORKFLOW LIBRARY

### Workflow 1: Full Marketing Strategy

```
Trigger: User request or onboarding completion
Duration: 2-4 hours (async)
Approval gates: 2

STEPS:
1. [PARALLEL] Research Phase
   ├── Research Agent: Market analysis
   ├── Research Agent: Competitor deep-dive
   └── Analytics Agent: Current performance baseline

2. Strategy Agent: 90-day marketing strategy (uses research outputs)

3. [APPROVAL GATE #1]: Strategy review by Marketing Manager

4. [PARALLEL] Tactical Planning
   ├── SEO Agent: Keyword universe + content strategy
   ├── Ads Agent: Paid media recommendation
   ├── Email Agent: Email strategy
   └── Social Agent: Social media strategy

5. [APPROVAL GATE #2]: Full plan review by Campaign Director

6. Content Agent: Create first batch of content assets

7. Notification: Complete, with links to all deliverables
```

### Workflow 2: Weekly Content Calendar

```
Trigger: Cron (every Monday 8am tenant timezone)
Duration: 30-60 minutes
Approval gates: 1

STEPS:
1. Analytics Agent: Review last week's performance
2. Research Agent: Trending topics in industry
3. Content Agent: Generate 5-10 content pieces (based on strategy from memory)
4. [APPROVAL GATE]: Content Reviewer approves/edits content
5. Social Agent: Schedule approved content across platforms
6. Notification: Calendar published to Notion/Airtable (if connected)
```

### Workflow 3: SEO Audit & Action Plan

```
Trigger: Monthly or on-demand
Duration: 1-3 hours
Approval gates: 1

STEPS:
1. [PARALLEL] Technical SEO analysis
   ├── Site crawler (technical issues)
   ├── PageSpeed analysis
   └── Search Console data pull

2. SEO Agent: Analyze data + prioritize issues

3. SEO Agent: Keyword gap analysis

4. [APPROVAL GATE]: SEO Manager reviews recommendations

5. Content Agent: Create briefs for priority content gaps

6. Jira/Trello integration: Create technical fix tickets (if connected)
```

### Workflow 4: Paid Ad Campaign Launch

```
Trigger: User initiates
Duration: 1-2 hours
Approval gates: 3

STEPS:
1. Research Agent: Audience research + competitor ads
2. Ads Agent: Campaign strategy + structure
3. [APPROVAL GATE #1]: Campaign structure approved

4. Content Agent: Ad copy variants (3-5 per ad set)
5. [APPROVAL GATE #2]: Ad copy approved

6. Ads Agent: Final campaign setup instructions + budget allocation
7. [APPROVAL GATE #3]: Budget approval (blocks on Campaign Director)

8. Integration Hub: Push to Google Ads / Meta Ads (if connected)
9. Analytics Agent: Set up conversion tracking
```

### Workflow 5: Email Sequence Builder

```
Trigger: User selects sequence type (welcome, nurture, re-engagement)
Duration: 45-90 minutes
Approval gates: 1

STEPS:
1. Research Agent: Analyze successful sequences in industry
2. Email Agent: Design sequence structure (5-7 emails)
3. Content Agent: Write all emails in sequence
4. Email Agent: Subject line variants (3 per email)
5. [APPROVAL GATE]: All emails reviewed at once

6. Integration Hub: Load into Mailchimp/SendGrid/HubSpot
7. Email Agent: Set up automation triggers
```

---

## WORKFLOW BUILDER (Visual)

### Node Types for Frontend Builder

```typescript
// React Flow node types
enum NodeType {
    TRIGGER = "trigger",           // What starts the workflow
    AGENT = "agent",               // AI agent execution
    APPROVAL = "approval",         // Human approval gate
    CONDITION = "condition",       // If/else branching
    PARALLEL = "parallel",         // Run multiple branches simultaneously
    JOIN = "join",                 // Wait for all parallel branches
    INTEGRATION = "integration",   // External system call
    DELAY = "delay",               // Wait X hours/days
    NOTIFICATION = "notification", // Send notification
    END = "end"                    // Workflow complete
}

// Trigger types
enum TriggerType {
    MANUAL = "manual",             // User clicks Run
    SCHEDULE = "schedule",         // Cron expression
    EVENT = "event",               // Kafka event received
    WEBHOOK = "webhook",           // External HTTP trigger
    COMPLETION = "completion",     // Another workflow completes
    THRESHOLD = "threshold"        // KPI threshold crossed
}
```

### Workflow Definition JSON (Storage Format)

```json
{
  "workflow_id": "uuid",
  "tenant_id": "tenant_uuid",
  "name": "Weekly Content Calendar",
  "version": "1.0.0",
  "trigger": {
    "type": "schedule",
    "cron": "0 8 * * MON",
    "timezone": "America/New_York"
  },
  "nodes": [
    {
      "id": "analytics_review",
      "type": "agent",
      "agent_id": "analytics_agent",
      "config": {
        "task": "Review last week performance metrics",
        "inputs": { "lookback_days": 7 }
      }
    },
    {
      "id": "content_gen",
      "type": "agent",
      "agent_id": "content_agent",
      "config": {
        "task": "Generate 7 content pieces for this week",
        "inputs": {
          "performance_data": "$analytics_review.output",
          "content_types": ["blog", "linkedin", "twitter"]
        }
      },
      "depends_on": ["analytics_review"]
    },
    {
      "id": "approval",
      "type": "approval",
      "config": {
        "title": "Weekly Content Review",
        "required_role": "content_reviewer",
        "timeout_hours": 24,
        "escalation_role": "marketing_manager"
      },
      "depends_on": ["content_gen"]
    },
    {
      "id": "schedule_posts",
      "type": "integration",
      "integration": "buffer",
      "config": {
        "action": "schedule_posts",
        "inputs": {
          "content": "$approval.approved_content"
        }
      },
      "depends_on": ["approval"],
      "condition": "$approval.approved == true"
    }
  ]
}
```

---

## WORKFLOW STATE MACHINE

```python
class WorkflowStateMachine:
    VALID_TRANSITIONS = {
        WorkflowStatus.DRAFT: [WorkflowStatus.QUEUED, WorkflowStatus.ARCHIVED],
        WorkflowStatus.QUEUED: [WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED],
        WorkflowStatus.RUNNING: [
            WorkflowStatus.PAUSED,
            WorkflowStatus.WAITING_APPROVAL,
            WorkflowStatus.COMPLETED,
            WorkflowStatus.FAILED
        ],
        WorkflowStatus.PAUSED: [WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED],
        WorkflowStatus.WAITING_APPROVAL: [WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED],
        WorkflowStatus.FAILED: [WorkflowStatus.RETRYING, WorkflowStatus.CANCELLED],
        WorkflowStatus.RETRYING: [WorkflowStatus.RUNNING, WorkflowStatus.FAILED],
        WorkflowStatus.COMPLETED: [],  # Terminal
        WorkflowStatus.CANCELLED: [],  # Terminal
        WorkflowStatus.ARCHIVED: [],   # Terminal
    }
    
    async def transition(
        self, execution_id: UUID, new_status: WorkflowStatus, reason: str = None
    ):
        current = await self.db.get_execution_status(execution_id)
        
        if new_status not in self.VALID_TRANSITIONS[current]:
            raise InvalidTransitionError(
                f"Cannot transition from {current} to {new_status}"
            )
        
        await self.db.update_execution_status(execution_id, new_status)
        
        # Emit state change event
        await self.kafka.publish("workflow.state_changed", {
            "execution_id": str(execution_id),
            "from_status": current.value,
            "to_status": new_status.value,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Notify via WebSocket for real-time UI updates
        await self.ws_manager.broadcast_to_tenant(
            tenant_id=execution.tenant_id,
            message=WorkflowStatusUpdate(
                execution_id=execution_id,
                status=new_status
            )
        )
```

---

## RETRY POLICIES

```python
# Temporal retry policies per workflow type
RETRY_POLICIES = {
    "agent_execution": RetryPolicy(
        initial_interval=timedelta(seconds=10),
        backoff_coefficient=2.0,
        maximum_interval=timedelta(minutes=5),
        maximum_attempts=3,
        non_retryable_error_types=[
            "ValidationError",
            "PermissionError",
            "BudgetExceededError"
        ]
    ),
    "integration_call": RetryPolicy(
        initial_interval=timedelta(seconds=30),
        backoff_coefficient=2.0,
        maximum_interval=timedelta(minutes=10),
        maximum_attempts=5
    ),
    "approval_check": RetryPolicy(
        initial_interval=timedelta(minutes=1),
        maximum_interval=timedelta(hours=1),
        maximum_attempts=0  # Infinite — wait as long as needed
    )
}
```

---

*Workflow Engine Design v1.0*