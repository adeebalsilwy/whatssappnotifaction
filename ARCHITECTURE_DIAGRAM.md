# WhatsApp Messaging System - Architecture Diagrams

## High-Level Architecture (HLD)

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web/Mobile Clients]
    end
    
    subgraph "Presentation Layer"
        B[Next.js Frontend]
        C[Dashboard UI]
    end
    
    subgraph "API Gateway Layer"
        D[Express.js Gateway Service]
        E[Notification Controller]
        F[Admin Controller]
        G[Webhook Controller]
    end
    
    subgraph "Business Logic Layer"
        H[WhatsApp Notification Service]
        I[Dispatch Service]
        J[Validation Service]
        K[Template Service]
    end
    
    subgraph "Provider Layer"
        L[Meta WhatsApp Provider]
        M[Vonage Provider]
        N[Twilio Provider]
        O[FAD SMS Provider]
        P[Generic Provider]
    end
    
    subgraph "Data Layer"
        Q[SQLite Database]
        R[File Storage Logs]
    end
    
    subgraph "External Services"
        S[Meta WhatsApp API]
        T[Vonage API]
        U[Twilio API]
        V[Yemeni Telecom API]
    end
    
    A --> B
    B --> D
    D --> E
    D --> F
    D --> G
    E --> H
    H --> I
    H --> J
    H --> K
    I --> L
    I --> M
    I --> N
    I --> O
    I --> P
    L --> S
    M --> T
    N --> U
    O --> V
    H --> Q
    H --> R
```

## Low-Level Architecture (LLD)

```mermaid
graph TB
    subgraph "Request Flow"
        A[HTTP Request]
        A --> B[Input Validation]
        B --> C[Phone Number Normalization]
        C --> D[Transaction ID Generation]
        D --> E[Message Persistence]
        E --> F[Provider Selection]
        F --> G[Message Dispatch]
        G --> H[Response Processing]
        H --> I[Status Update]
        I --> J[Response Return]
    end
    
    subgraph "Provider Selection Logic"
        K[Get Provider Priorities from DB]
        L[Check Provider Availability]
        M[Apply Retry Logic]
        N[Execute Fallback Chain]
        K --> L
        L --> M
        M --> N
    end
    
    subgraph "Database Operations"
        O[Providers Table]
        P[Messages Table]
        Q[Routing Rules Table]
        R[Provider Priority Table]
        S[Message Templates Table]
    end
    
    subgraph "Logging System"
        T[Ingress Logger]
        U[Egress Logger]
        V[Multi-category File Logs]
        W[Audit Logger]
    end
    
    A -.-> K
    E -.-> O
    E -.-> P
    F -.-> Q
    F -.-> R
    F -.-> S
    E -.-> T
    H -.-> U
    H -.-> V
    H -.-> W
```

## Data Flow Diagram

```mermaid
graph LR
    subgraph "Inbound Flow"
        A[Client API Request]
        A --> B[Normalize Phone Number]
        B --> C[Validate Message Content]
        C --> D[Generate Transaction ID]
        D --> E[Save to Messages Table]
        E --> F[Set Status: RECEIVED]
    end
    
    subgraph "Processing Flow"
        F --> G[Select Provider Based on Priority]
        G --> H[Check Provider Config]
        H --> I{Provider Available?}
        I -->|Yes| J[Send Message via Provider]
        I -->|No| K[Mark as Failed]
        J --> L[Wait for Response]
        L --> M{Success?}
        M -->|Yes| N[Update Status: SENT]
        M -->|No| O[Trigger Fallback Logic]
        O --> P[Try Next Provider]
        P --> Q{Success?}
        Q -->|Yes| N
        Q -->|No| K
    end
    
    subgraph "Outbound Flow"
        N --> R[Log Successful Delivery]
        K --> S[Log Failure with Error Details]
        N --> T[Return Success Response]
        K --> U[Return Error Response]
    end
```

## Component Interaction Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant NotificationService
    participant Provider
    participant ExternalAPI
    
    Client->>Gateway: POST /api/notify
    Gateway->>NotificationService: validate and normalize
    NotificationService->>Gateway: transactionId
    Gateway->>Gateway: persist to DB
    Gateway->>NotificationService: dispatch message
    NotificationService->>Provider: select provider
    Provider->>ExternalAPI: send message
    ExternalAPI-->>Provider: response
    Provider-->>NotificationService: result
    NotificationService-->>Gateway: status update
    Gateway-->>Client: queued response
```

## Security Architecture

```mermaid
graph TD
    subgraph "Security Layer"
        A[Authentication Middleware]
        B[Authorization Checks]
        C[Input Sanitization]
        D[Rate Limiting]
        E[Request Validation]
        F[Secure Logging]
    end
    
    subgraph "Access Control"
        G[RBAC System]
        H[Permission Checks]
        I[Role Validation]
    end
    
    subgraph "Data Protection"
        J[Encrypted Config Storage]
        K[Secure Token Management]
        L[Database Security]
    end
    
    A --> C
    B --> H
    C --> E
    D --> A
    E --> F
    G --> I
    H --> J
    I --> K
    F --> L
```