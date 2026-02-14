# **App Name**: MultiProvider WhatsApp Gateway

## Core Features:

- API Endpoint: Receive HTTP POST requests with a JSON payload containing message details from the Core Banking system at /api/whatsapp/send.
- Provider Interface: Define a TypeScript interface IWhatsAppProvider with a sendTextMessage function to abstract WhatsApp provider implementations.
- Multi-Provider Support: Implement WhatsApp providers such as Meta WhatsApp Cloud API, Vonage, and a Generic provider with independent implementations in the src/providers directory.
- Dynamic Provider Selection: Choose the WhatsApp provider based on the provider field in the request JSON or the DEFAULT_PROVIDER environment variable.
- Request Validation: Validate incoming requests using Zod, and return a JSON response with specific error messages upon validation failure.
- Message Logging: Log all sent messages to daily text files in the logs/ directory, including timestamps, provider details, and request/response information, using fs/promises and appendFile.
- Dashboard Interface: Develop a dashboard page in app/dashboard/page.tsx using Tailwind CSS and shadcn/ui. Display the last 100 messages (or mock data) and provide filtering options by date, provider, and status.

## Style Guidelines:

- Primary color: A muted teal (#4DB6AC) evokes reliability and clear communication.
- Background color: A very light gray (#FAFAFA) for a clean, professional feel, providing a subtle contrast to the text and primary color.
- Accent color: A gentle green (#80CBC4), similar in hue to the primary color, which will give interactive elements of the dashboard a calm appearance.
- Body and headline font: 'Inter' (sans-serif) for a modern and neutral user interface.
- Use consistent and clear icons from 'lucide-react' to represent message status, providers, and filter options within the dashboard.
- A clean, well-organized layout for the dashboard, utilizing a grid system to arrange the message table, filters, and chart in a visually appealing and user-friendly manner. Prioritize readability and ease of navigation.