# SokogateOS Frontend Architecture

## Overview
This document outlines the frontend architecture of sokogateOS, built with React 18, Vite, and Tailwind CSS. The frontend provides an intuitive user interface for African wholesalers, importers, exporters, and procurement managers to interact with the AI Operating System.

## Technology Stack

### Core Technologies
- **Framework**: React 18.2.0 with React DOM
- **Build Tool**: Vite 7.0.0 (fast development server and bundler)
- **Styling**: Tailwind CSS 3.3.6 with PostCSS and Autoprefixer
- **Routing**: React Router DOM 6.20.0 (client-side routing)
- **State Management**: React Context API (for auth) + local state
- **Data Visualization**: Recharts 2.10.0 (for charts and graphs)
- **Real-time Communication**: Socket.io-client 4.7.2 (WebSocket connections)
- **Type Checking**: PropTypes (via React) - considering migration to TypeScript

### Development Tools
- **Formatter**: Prettier
- **Linter**: ESLint (inherited from root)
- **Icons**: Considering Heroicons or similar for consistent iconography
- **HTTP Client**: Fetch API or Axios (to be standardized)

## Architecture Overview

### 1. Layered Architecture
The frontend follows a layered architecture pattern:

```
┌─────────────────────────────────┐
│        Presentation Layer       │
│  (Components, Pages, Layouts)   │
└─────────────────────────────────┘
          │         ▲
          ▼         │
┌─────────────────────────────────┐
│      Application Layer          │
│  (Context, Hooks, Services)     │
└─────────────────────────────────┘
          │         ▲
          ▼         │
┌─────────────────────────────────┐
│       Infrastructure Layer      │
│  (API Client, Config, Utils)    │
└─────────────────────────────────┘
```

### 2. Directory Structure
```
frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Images, icons, fonts
│   ├── components/         # Reusable UI components
│   ├── context/            # React Context providers
│   ├── data/               # Static data and mock data
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Page layouts (headers, footers, sidebar)
│   ├── pages/              # Page components (route-connected)
│   ├── services/           # API service clients
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Root application component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles (Tailwind base)
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── index.html              # HTML template
└── package.json            # Dependencies and scripts
```

## Detailed Component Architecture

### 1. Presentation Layer
#### Components (`src/components/`)
- **UI Primitives**: Buttons, inputs, modals, tooltips, badges, avatars
- **Layout Components**: Headers, footers, sidebars, breadcrumbs
- **Data Display**: Tables, cards, lists, charts, timelines
- **Forms**: Input groups, validation components, wizards
- **Navigation**: Menus, tabs, pagination, stepper
- **Feedback**: Alerts, notifications, loading spinners, progress bars
- **Specialized**: AI-specific components (agent charts, workflow visualizers)

#### Pages (`src/pages/`)
- **Authentication**: LoginPage, TermsAcceptancePage
- **Dashboard**: DashboardPage (main overview), ExecutiveDashboard
- **Feature Pages**: 
  - ProcurementDashboard (sourcing operations)
  - LogisticsDashboard (supply chain visibility)
  - WhatsAppDashboard (communication hub)
  - SupplierTrustDashboard (verification network)
  - CustomsDashboard (regulatory compliance)
  - QMeDashboard (task automation)
  - HermesAdminPage (AI agent management)
- **Static Pages**: LandingPage, TermsOfServicePage, PrivacyPolicyPage
- **Error Pages**: NotFound, AccessDenied, ServerError (to be implemented)

#### Layouts (`src/layouts/`)
- **MainLayout**: Default layout with header, sidebar, and content area
- **AuthLayout**: Minimal layout for login/register pages
- **EmptyLayout**: Full-bleed layouts for landing pages

### 2. Application Layer
#### Context (`src/context/`)
- **AuthContext**: Manages authentication state (user info, token, login/logout)
- **ThemeContext**: (Planned) For dark/light mode and theme customization
- **NotificationContext**: (Planned) For global notification system

#### Custom Hooks (`src/hooks/`)
- **useAuth**: Wrapper around AuthContext for easier access
- **useApi**: (Planned) Standardized API request hook with loading/error states
- **useWebSocket**: (Planned) For real-time data subscriptions
- **usePagination**: (Planned) For paginated data fetching
- **useForm**: (Planned) For form state management and validation

#### Services (`src/services/`)
- **apiClient.js**: Centralized HTTP client with interceptors
- **authService.js**: Authentication API wrapper
- **dashboardService.js**: Dashboard data fetching
- *(More services to be created per domain)*

### 3. Infrastructure Layer
#### Utilities (`src/utils/`)
- **formatters.js**: Date, currency, number formatting utilities
- **validators.js**: Input validation functions (email, phone, etc.)
- **constants.js**: Application constants (API endpoints, roles, etc.)
- **helpers.js**: Miscellaneous helper functions
- **route.js**: Route definitions and navigation helpers

#### Configuration
- **Vite**: Configured for React with plugin, CSS preprocessing
- **Tailwind**: Extended color scheme (sokogateOS brand colors)
- **Environment Variables**: VITE_API_URL, VITE_WS_URL for different environments

## Key Architectural Decisions

### 1. State Management Approach
- **Local State**: Component-level state for UI interactions
- **Context API**: Global state for authentication (user, token)
- **URL State**: Router state for navigation and sharing links
- **Future Consideration**: Redux Toolkit or Zustand for complex state
- **Avoiding Prop Drilling**: Context and custom handlers for deep component trees

### 2. Data Fetching Strategy
- **Fetch API**: Native browser API for HTTP requests
- **Loading States**: UI shows skeletons/spinners during data fetch
- **Error Handling**: Consistent error boundaries and retry mechanisms
- **Caching**: (Planned) React Query or SWR for data caching and synchronization
- **Real-time Updates**: Socket.io for live data (dashboard metrics, notifications)

### 3. Code Organization
- **Feature-Based Grouping**: Components organized by feature when complex
- **Reusability**: Generic components in components/, specific ones near usage
- **Code Splitting**: Lazy loading via React.lazy() and Suspense for route-based splitting
- **Consistent Naming**: PascalCase for components, camelCase for functions/vars
- **File Size**: Keeping files under 200 lines when possible

### 4. Styling Approach
- **Utility-First**: Tailwind CSS for rapid UI development
- **Component Styles**: @apply for repeating utility patterns
- **Responsive Design**: Mobile-first breakpoint system (sm, md, lg, xl, 2xl)
- **Dark Mode**: (Planned) Using Tailwind's dark mode variant
- **CSS Variables**: For theme colors that need JS access

### 5. Performance Optimization
- **Code Splitting**: Route-based lazy loading
- **Bundle Analysis**: (Planned) Regular bundle size monitoring
- **Image Optimization**: Next-gen formats, lazy loading, proper sizing
- **CSS Optimization**: PurgeCSS via Tailwind for production builds
- **Memoization**: React.memo(), useMemo(), useCallback() where beneficial
- **Virtual Scrolling**: (Planned) For large lists and tables

### 6. Accessibility (a11y)
- **Semantic HTML**: Proper use of landmarks, headings, lists
- **ARIA Attributes**: Where native semantics insufficient
- **Keyboard Navigation**: Tab order, focus management, shortcuts
- **Color Contrast**: Meeting WCAG AA standards
- **Screen Reader Support**: Testing with NVDA/VoiceOver
- **Focus Indicators**: Visible focus states for all interactive elements

### 7. Error Handling
- **Error Boundaries**: React Error Boundaries for graceful degradation
- **API Errors**: Consistent error formatting and user-friendly messages
- **Validation Errors**: Inline field validation with clear guidance
- **Network Errors**: Retry mechanisms and offline indicators
- **Logging**: Controlled console logging in development, remote logging in prod

## Data Flow and Communication

### 1. Authentication Flow
```
User Login → Auth Service (POST /api/auth/login) 
           → JWT Token stored in context/localStorage
           → AuthContext updated with user data
           → Protected routes check AuthContext for user
           → Token sent as Authorization header on API requests
           → Logout clears context/storage and redirects to login
```

### 2. Data Fetching Pattern
```
Component mounts/useEffect → Custom hook or service call
                         → API Client creates request with headers
                         → Request sent to backend API
                         → Response processed (JSON parsing)
                         → Loading state cleared
                         → Data stored in state/context
                         → Component re-renders with data
                         → Error states handled gracefully
```

### 3. Real-time Communication Flow
```
Socket.io Connection established on app load
→ Join relevant rooms based on user role/permissions
→ Listen for events (notifications, updates, alerts)
→ Update local state/context when events received
→ Components subscribed to state re-render with new data
→ Heartbeats maintain connection health
→ Reconnection logic handles network interruptions
```

### 4. Form Submission Pattern
```
User input → Controlled component state
           → Validation on blur/submit
           → Submit disabled if invalid
           → API call with form data
           → Loading state during submission
           → Success: show confirmation, redirect/reset
           → Error: display field-specific or general errors
           → Reset form after successful submission (when appropriate)
```

## Security Considerations

### 1. Authentication Security
- **JWT Storage**: HttpOnly cookie preferred, localStorage fallback with XSS mitigation
- **Token Refresh**: Silent refresh before expiration
- **Session Timeout**: Automatic logout after inactivity
- **Password Handling**: Never store or log passwords
- **2FA Support**: (Planned) TOTP and SMS-based authentication

### 2. Data Protection
- **XSS Prevention**: React auto-escaping, DOMPurify for HTML content
- **CSRF Protection**: SameSite cookies, CSRF tokens for state-changing operations
- **CORS**: Strict origin validation on backend
- **Sensitive Data**: Masking of PII in UI (showing only last 4 digits, etc.)
- **HTTPS**: Enforced in production, HSTS headers

### 3. API Security
- **Input Validation**: Client-side validation as UX, server-side as security
- **Rate Limiting Awareness**: UI indicates when limits approached
- **Error Information**: Generic error messages in production, detailed in dev
- **Endpoint Protection**: Authentication required for all API routes except public ones

### 4. Dependency Security
- **Regular Updates**: Automated dependency scanning (Dependabot/npm audit)
- **Lockfile**: package-lock.json for consistent installations
- **Audit Scripts**: Regular security audits of frontend dependencies

## Performance Benchmarks

### Target Metrics
- **First Contentful Paint (FCP)**: < 1.5s on 3G
- **Largest Contentful Paint (LCP)**: < 2.5s on 3G
- **Time to Interactive (TTI)**: < 3.5s on 3G
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Total Blocking Time (TBT)**: < 150ms
- **Bundle Size**: < 2MB gzipped for initial load

### Optimization Strategies
- **Asset Optimization**: Compressed images, SVGs for icons
- **Font Loading**: System fonts fallback, font-display: swap
- **Third-party Scripts**: Asynchronous loading, minimal impact
- **Critical CSS**: Inline above-the-fold styles
- **Lazy Loading**: Images, components below the fold
- **Prefetching**: Predictive loading of likely next routes

## Resilience and Error Handling

### 1. Offline Capabilities
- **Detect Network Status**: Online/offline event listeners
- **Queue Operations**: Store actions locally when offline, sync when online
- **Cached Data**: Show last known data when API unavailable
- **User Feedback**: Clear indicators of offline status
- **Service Workers**: (Planned) For offline-first capabilities

### 2. Graceful Degradation
- **Feature Detection**: Check API availability before use
- **Fallback UIs**: Simplified versions when advanced features unavailable
- **Error Boundaries**: Isolate component failures
- **Retry Logic**: Exponential backoff for failed requests
- **Circuit Breaker**: Temporarily disable failing services

### 3. Monitoring and Analytics
- **Error Tracking**: (Planned) Sentry or similar for frontend errors
- **Performance Monitoring**: (Planned) Web Vitals tracking
- **Usage Analytics**: (Planned) Privacy-compliant analytics
- **Logging**: Structured logging for debugging
- **Health Checks**: Frontend-specific health check endpoints

## Development Workflow

### 1. Coding Standards
- **Formatting**: Prettier on save
- **Linting**: ESLint with React recommended rules
- **Naming**: Descriptive, consistent names
- **Comments**: JSDoc for complex functions, clear intent
- **File Organization**: One component per file when reasonable
- **Testing**: (Planned) Jest with React Testing Library

### 2. Git Workflow
- **Branching**: Feature branching from dev branch
- **Commits**: Conventional commit messages
- **Pull Requests**: Required for all changes
- **Code Review**: Mandatory approvals
- **CI/CD**: GitHub Actions for linting, building, testing

### 3. Build and Deployment
- **Development**: `vite dev` with hot module replacement
- **Staging**: `vite build` to dist/ for staging deployment
- **Production**: Optimized build with caching headers
- **Asset Fingerprinting**: Content-based cache busting
- **Environment Variables**: Different configs for dev/staging/prod
- **Rollback Strategy**: Previous version retention for quick rollback

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Establish coding standards and linting configuration
- [ ] Create reusable component library (buttons, inputs, modals)
- [ ] Implement authentication flow with context protection
- [ ] Set up API client with interceptors and error handling
- [ ] Create basic layout system (header, sidebar, footer)
- [ ] Implement responsive design breakpoints
- [ ] Add loading states and error boundaries

### Phase 2: Core Features (Weeks 3-4)
- [ ] Implement DashboardPage with key metrics widgets
- [ ] Build ProcurementDashboard with supplier search and RFQ
- [ ] Create LogisticsDashboard with shipment tracking and maps
- [ ] Develop WhatsAppDashboard for conversation management
- [ ] Add notification system (bell icon, dropdown, toast)
- [ ] Implement user profile and settings management
- [ ] Create role-based access control in UI

### Phase 3: Advanced Features (Weeks 4-6)
- [ ] Build SupplierTrustDashboard with verification network
- [ ] Create CustomsDashboard with document processing
- [ ] Develop QMeDashboard with task automation visualization
- [ ] Implement HermesAdminPage for AI agent monitoring
- [ ] Add real-time updates via Socket.io
- [ ] Create data export functionality (CSV, PDF)
- [ ] Implement advanced filtering and search capabilities

### Phase 4: Optimization (Weeks 6-8)
- [ ] Performance optimization (bundle analysis, lazy loading)
- [ ] Accessibility audits and fixes (WCAG compliance)
- [ ] Security review (XSS, CSRF, sensitive data exposure)
- [ ] Add offline capabilities with service workers
- [ ] Implement dark mode theme
- [ ] Add comprehensive testing (unit, integration, e2e)
- [ ] Create documentation and storybook for components
- [ ] Prepare for production deployment with monitoring

## Success Criteria

### User Experience
- **Task Completion Rate**: >90% for core user journeys
- **User Satisfaction**: >4.5/5 in post-task surveys
- **Time to Task**: <2 minutes for common operations
- **Error Rate**: <5% of user actions resulting in errors
- **Adoption Rate**: >80% of target users using within 3 months

### Technical Performance
- **Page Load**: <3s on 3G for first visit, <1s on repeat visits
- **Runtime Performance**: 60fps animations, <16ms frame times
- **Bundle Size**: <2MB gzipped initial load
- **API Efficiency**: <20% wasted requests (failed, redundant)
- **Memory Usage**: <100MB sustained in typical usage
- **Error Frequency**: <1% of page views resulting in JS errors

### Quality Metrics
- **Code Coverage**: >80% unit test coverage for critical paths
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: No critical or high vulnerabilities in scans
- **Maintainability**: <10W/H file (maintainability index)
- **Documentation**: 100% of public components documented

## Conclusion
The sokogateOS frontend architecture provides a solid foundation for building a scalable, maintainable, and user-friendly interface for the AI Operating System. By leveraging modern React practices, utility-first CSS with Tailwind, and a modular architecture, the frontend is well-positioned to evolve with the system's growing feature set while maintaining high performance and usability standards.

The architecture supports:
- Rapid feature development through component reusability
- Excellent performance through code splitting and optimization
- Strong accessibility foundations for inclusive design
- Robust error handling and resilience patterns
- Scalable state management approaches
- Secure practices protecting user data and system integrity
- Excellent developer experience with clear conventions and tooling

Next steps involve implementing the features outlined in the roadmap, beginning with foundational components and authentication, then progressing through core dashboards and advanced features, culminating in optimization and production readiness.