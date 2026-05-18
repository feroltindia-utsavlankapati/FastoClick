# Security & Governance Plan
## Agentic AI Digital Marketing OS

---

## 1. RBAC DESIGN

### Role Hierarchy

```
SUPER_ADMIN (Anthropic/Platform team)
    └── TENANT_OWNER
            ├── ADMIN
            │   ├── CAMPAIGN_DIRECTOR
            │   │   ├── MARKETING_MANAGER
            │   │   │   ├── CONTENT_REVIEWER
            │   │   │   └── ANALYST (read-only)
            │   └── DEVELOPER (API access)
            └── BILLING_ADMIN
```

### Role Permissions Matrix

| Permission | Super Admin | Tenant Owner | Admin | Campaign Director | Marketing Manager | Content Reviewer | Analyst |
|------------|-------------|--------------|-------|-------------------|-------------------|------------------|---------|
| Manage agents | ✓ | ✓ | ✓ | - | - | - | - |
| Create workflows | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Execute workflows | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| Approve content | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Approve strategy | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Approve budgets | ✓ | ✓ | ✓ | Limited | - | - | - |
| Manage integrations | ✓ | ✓ | ✓ | - | - | - | - |
| View analytics | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| Manage users | ✓ | ✓ | ✓ | - | - | - | - |
| Manage billing | ✓ | ✓ | - | - | - | - | - |
| View audit logs | ✓ | ✓ | ✓ | - | - | - | - |

---

## 2. API SECURITY

### JWT Token Structure

```python
# Access token payload (1 hour expiry)
{
    "sub": "user_uuid",
    "tenant_id": "tenant_uuid",
    "roles": ["marketing_manager"],
    "permissions": ["content:approve", "workflow:execute"],
    "plan": "pro",
    "iat": 1700000000,
    "exp": 1700003600,
    "jti": "unique_token_id"  # For revocation
}

# Internal service token (15 min expiry, CGH-issued)
{
    "service_id": "agent_orchestrator",
    "tenant_id": "tenant_uuid",
    "allowed_services": ["memory_service", "approval_service"],
    "allowed_operations": ["read", "write"],
    "iat": 1700000000,
    "exp": 1700000900
}
```

### Rate Limiting Strategy

```yaml
# API Gateway rate limits (per tenant, per plan)
rate_limits:
  starter:
    requests_per_minute: 60
    agent_executions_per_hour: 20
    workflow_runs_per_day: 10
    
  pro:
    requests_per_minute: 300
    agent_executions_per_hour: 100
    workflow_runs_per_day: 50
    
  enterprise:
    requests_per_minute: 1000
    agent_executions_per_hour: 500
    workflow_runs_per_day: 500

# Separate limits for AI-heavy endpoints
ai_rate_limits:
  agent_spawn: 10/min per tenant
  bulk_content_generation: 1/min per tenant
  strategy_generation: 5/hour per tenant
```

---

## 3. ENCRYPTION STRATEGY

| Data Type | Encryption | Where |
|-----------|-----------|-------|
| Passwords | Argon2id (not AES) | Never stored, only hash |
| PII (names, emails) | AES-256-GCM field-level | PostgreSQL, app-side |
| API keys/secrets | AES-256 envelope + Vault | HashiCorp Vault |
| AI prompt inputs | TLS in transit | Not stored (only hashes) |
| AI outputs | TLS in transit | AES at rest in S3 |
| Vector embeddings | AES at rest | Qdrant at-rest encryption |
| Audit logs | AES + signing | S3 with object lock |
| Backups | AES-256 | S3 Glacier + KMS |

### Field-Level Encryption

```python
# For PII fields in PostgreSQL
class EncryptedField:
    def __init__(self, key_path: str):
        self.key_path = key_path
    
    def encrypt(self, value: str, tenant_id: str) -> str:
        key = vault.get_tenant_key(tenant_id, self.key_path)
        return aes_gcm_encrypt(value, key)
    
    def decrypt(self, ciphertext: str, tenant_id: str) -> str:
        key = vault.get_tenant_key(tenant_id, self.key_path)
        return aes_gcm_decrypt(ciphertext, key)

# Usage in SQLAlchemy model
class ContactLead(Base):
    __tablename__ = "contact_leads"
    id = Column(UUID, primary_key=True)
    tenant_id = Column(UUID, nullable=False)
    email_encrypted = Column(Text)  # Stored encrypted
    name_encrypted = Column(Text)   # Stored encrypted
    
    @property
    def email(self) -> str:
        return email_field.decrypt(self.email_encrypted, self.tenant_id)
```

---

## 4. AI-SPECIFIC SECURITY

### Prompt Injection Protection

```python
class PromptGuard:
    INJECTION_PATTERNS = [
        r"ignore (all |previous |above |prior )?instructions",
        r"you are now",
        r"act as (a |an )?",
        r"disregard your (system |previous )",
        r"forget everything",
        r"new instructions:",
        r"\[SYSTEM\]",
        r"<\|im_start\|>",
    ]
    
    SEMANTIC_CLASSIFIER = load_classifier("prompt-injection-detector-v2")
    
    async def check(self, prompt: str, agent_id: str, tenant_id: str) -> GuardResult:
        # 1. Pattern matching (fast)
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, prompt, re.IGNORECASE):
                await self.audit.log_injection_attempt(agent_id, tenant_id, prompt)
                return GuardResult(safe=False, reason="pattern_match")
        
        # 2. Semantic classifier (slower, more accurate)
        score = await self.SEMANTIC_CLASSIFIER.predict(prompt)
        if score > 0.85:
            await self.audit.log_injection_attempt(agent_id, tenant_id, prompt)
            await self.anomaly_detector.increment_threat_score(tenant_id)
            return GuardResult(safe=False, reason="semantic_detection")
        
        return GuardResult(safe=True)

### PII Scanner for AI Outputs

```python
class PIIScanner:
    """Scan AI outputs before delivering to client"""
    
    PATTERNS = {
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "phone": r"\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
    }
    
    async def scan(self, output: str, context: ScanContext) -> ScanResult:
        findings = []
        for pii_type, pattern in self.PATTERNS.items():
            matches = re.finditer(pattern, output)
            for match in matches:
                findings.append(PIIFinding(
                    type=pii_type,
                    location=match.span(),
                    value_hash=hashlib.sha256(match.group().encode()).hexdigest()
                ))
        
        if findings:
            await self.audit.log_pii_in_output(context, findings)
        
        return ScanResult(findings=findings, clean=len(findings) == 0)
```

---

## 5. AUDIT & COMPLIANCE

### Audit Log Schema

```python
class AuditLogEntry(BaseModel):
    id: UUID
    timestamp: datetime
    tenant_id: UUID
    user_id: Optional[UUID]
    agent_id: Optional[str]
    service: str
    action: str                     # e.g., "workflow.execute", "agent.spawn"
    resource_type: str              # e.g., "workflow", "agent_execution"
    resource_id: Optional[UUID]
    input_hash: Optional[str]       # SHA256 of sanitized input
    output_hash: Optional[str]      # SHA256 of sanitized output
    decision: str                   # "allowed" | "denied" | "escalated"
    governance_policy: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    duration_ms: int
    metadata: dict

# Kafka topic: governance.audit
# Retention: Kafka 30 days, S3 Glacier 7 years
# Format: JSON, cryptographically signed by CGH
```

### GDPR Compliance Tools

```python
class GDPRTools:
    async def export_tenant_data(self, tenant_id: UUID) -> DataExport:
        """Article 20 - Data portability"""
        return DataExport(
            tenant_data=await self.db.get_tenant_record(tenant_id),
            users=await self.db.get_tenant_users(tenant_id),
            campaigns=await self.db.get_tenant_campaigns(tenant_id),
            content=await self.db.get_tenant_content(tenant_id),
            agent_history=await self.db.get_agent_history(tenant_id),
            memory_export=await self.memory_service.export(tenant_id)
        )
    
    async def delete_tenant_data(self, tenant_id: UUID) -> DeletionReport:
        """Article 17 - Right to erasure"""
        # Soft-delete first (30 day grace period)
        await self.db.soft_delete_tenant(tenant_id)
        
        # Schedule hard delete after grace period
        await self.scheduler.schedule(
            task="hard_delete_tenant",
            params={"tenant_id": tenant_id},
            run_at=datetime.utcnow() + timedelta(days=30)
        )
        
        return DeletionReport(
            scheduled_for=datetime.utcnow() + timedelta(days=30),
            affected_records=await self.count_tenant_records(tenant_id)
        )
    
    async def anonymize_user(self, user_id: UUID, tenant_id: UUID):
        """Anonymize user PII while retaining analytics data"""
        await self.db.anonymize_user_pii(user_id)  # Replace with "Deleted User"
        await self.memory_service.remove_user_associations(user_id, tenant_id)
```

---

*Security & Governance Plan v1.0*