# Project Structure Overview

This document provides an overview of the WhatsApp Gateway project structure after reorganization.

## 📁 Directory Structure

```
whatsapp/
├── src/                    # Source code (Next.js application)
│   ├── app/               # Next.js app router pages and APIs
│   ├── components/        # React UI components
│   ├── config/            # Configuration files and templates
│   ├── gateway/           # Gateway services and controllers
│   ├── hooks/             # React custom hooks
│   ├── lib/               # Shared libraries and utilities
│   ├── providers/         # WhatsApp provider implementations
│   ├── server/            # Server-side database and business logic
│   └── services/          # Core application services
├── data/                  # Persistent data files
│   └── gateway.db         # SQLite database
├── dev-tools/             # Development utilities and scripts
├── docs/                  # Documentation files
├── logs/                  # Application log files
├── postman/              # Postman collections for API testing
├── scripts/              # Utility scripts (TypeScript)
├── tests/                # Test files
├── .eslintrc.json        # ESLint configuration
├── .gitignore            # Git ignore rules
├── apphosting.yaml       # Firebase hosting configuration
├── components.json        # shadcn/ui component configuration
├── next.config.ts        # Next.js configuration
├── package.json          # NPM package configuration
├── postcss.config.mjs    # PostCSS configuration
├── README.md             # Main project documentation
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── tsconfig.server.json  # Server-side TypeScript configuration
```

## 📖 Directory Descriptions

### `src/` - Source Code
Contains all the application source code organized by functionality:
- **app/** - Next.js pages, API routes, and dashboard components
- **components/** - Reusable React UI components (shadcn/ui)
- **config/** - Application configuration files and WhatsApp templates
- **gateway/** - Core gateway services, providers, and controllers
- **hooks/** - Custom React hooks
- **lib/** - Shared utilities, types, and helper functions
- **providers/** - WhatsApp provider implementations (Meta, Vonage, etc.)
- **server/** - Server-side database repositories and business logic
- **services/** - Core application services

### `data/` - Data Files
Contains persistent data files:
- **gateway.db** - SQLite database with messages, providers, templates, and logs

### `dev-tools/` - Development Tools
Contains utilities for development and debugging:
- Database inspection and initialization scripts
- Integration testing tools
- Configuration verification utilities
- Diagnostic scripts for troubleshooting

### `docs/` - Documentation
Comprehensive documentation for the project:
- Setup guides and integration documentation
- API documentation
- Technical specifications
- Implementation guides

### `logs/` - Log Files
Application log files organized by date:
- API request logs
- Error logs
- Message delivery logs
- Provider-specific debug logs

### `postman/` - API Testing
Postman collections for testing the API endpoints:
- WhatsApp API collection
- Gateway toolkit collection
- Various test scenarios

### `scripts/` - Utility Scripts
TypeScript utility scripts for various tasks:
- Template registration and management
- Fallback system testing
- Message conversion utilities

### `tests/` - Test Files
Automated test suites:
- Unit tests
- Integration tests
- Provider tests
- Validation tests

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Up Environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Initialize Database**:
   ```bash
   node dev-tools/init-database.js
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 📚 Documentation

Refer to the `docs/` directory for comprehensive documentation:
- **Setup Guides**: Installation and configuration instructions
- **API Documentation**: Endpoint specifications and examples
- **Integration Guides**: Provider-specific integration details
- **Technical Documentation**: Architecture and implementation details

## 🔧 Development Tools

The `dev-tools/` directory contains utilities for:
- Database management and inspection
- Integration testing
- Configuration verification
- Diagnostic troubleshooting

## 📝 Logging

Log files are stored in the `logs/` directory and include:
- Daily rotated log files
- Separate files for different log types
- Structured JSON logging for easy parsing

## 🧪 Testing

Run tests using:
```bash
npm test
npm run test:watch  # For continuous testing
```

## 📦 Deployment

For production deployment:
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Configure environment variables for production

## 🆘 Support

For issues and questions:
1. Check the documentation in `docs/`
2. Review logs in `logs/`
3. Use diagnostic tools in `dev-tools/`
4. Run integration tests to verify setup