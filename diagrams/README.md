# Architecture Diagrams

This directory contains Mermaid diagram files for the WhatsApp Messaging System architecture. Each diagram represents different aspects of the system architecture.

## Diagram Files

1. **hld_diagram.mmd** - High-Level Design (HLD) diagram showing the overall system architecture
2. **lld_diagram.mmd** - Low-Level Design (LLD) diagram showing detailed component interactions
3. **data_flow_diagram.mmd** - Data flow diagram showing the message processing flow
4. **component_interaction_diagram.mmd** - Component interaction diagram showing service communications
5. **security_architecture_diagram.mmd** - Security architecture diagram showing security layers

## Converting to Images

To convert these Mermaid files to images, you can use any of the following methods:

### Method 1: Online Mermaid Editors
- Visit https://mermaid.live
- Copy the content of any .mmd file
- View the diagram and download as PNG/SVG

### Method 2: VS Code Extension
- Install "Mermaid Preview" extension
- Open any .mmd file
- Use the export function to save as image

### Method 3: Command Line Tool
If you have mermaid-cli installed:
```bash
# Install mermaid-cli (if not already installed)
npm install -g @mermaid-js/mermaid-cli

# Convert each diagram to PNG
mmdc -i hld_diagram.mmd -o hld_diagram.png
mmdc -i lld_diagram.mmd -o lld_diagram.png
mmdc -i data_flow_diagram.mmd -o data_flow_diagram.png
mmdc -i component_interaction_diagram.mmd -o component_interaction_diagram.png
mmdc -i security_architecture_diagram.mmd -o security_architecture_diagram.png
```

## Architecture Overview

These diagrams represent the WhatsApp messaging system designed for banking environments with:
- Multi-provider redundancy and fallback mechanisms
- Country-specific number normalization for Yemen
- Comprehensive logging and audit trails
- Hierarchical database and file storage
- Flexible configuration and template management
- Built-in compliance and security features