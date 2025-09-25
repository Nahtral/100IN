# 100IN App - Complete Recreation Master Prompt

## Project Overview & Purpose

Create a comprehensive **basketball training and team management platform** called "100IN App" - a complete digital ecosystem for basketball organizations to manage players, coaches, staff, parents, and partners. The app serves as a central hub for player development, performance tracking, health monitoring, communication, and administrative management.

### Core Mission
Transform basketball training through AI-powered shot analysis, comprehensive player development tracking, and seamless team communication while providing robust administrative tools for complete organizational management.

## Technology Stack Requirements

**Frontend Framework:**
- React 18+ with TypeScript
- Vite build system
- TailwindCSS for styling
- shadcn/ui component library
- React Query for data fetching
- React Router for navigation
- Zustand for state management
- React Hook Form with Zod validation

**Backend & Database:**
- Supabase (authentication, database, storage, real-time)
- PostgreSQL with Row Level Security (RLS)
- Supabase Edge Functions for serverless logic
- Real-time subscriptions for live updates

**Design System:**
- Panthers-themed color palette:
  - Panthers Red: `#FF2A2A` (hsl(0 85% 58%))
  - Panther Gold: `#B38F54` (hsl(40 36% 52%))  
  - Deep Teal: `#004953` (hsl(188 100% 16%))
  - Panther Blue: `#002d72` (hsl(218 100% 22%))
  - White: `#ffffff` (primary background)
  - Black: `#000000` (primary text, buttons)

**Mobile & Performance:**
- Mobile-first responsive design
- PWA capabilities with offline support
- Capacitor for native mobile features
- Optimized for iOS and Android
- Touch-friendly interfaces (44px minimum touch targets)
- Safe area handling for notched devices

## User Roles & Permissions Matrix

### 1. Super Admin (Full System Access)
- Complete access to all features and data
- User management and role assignment
- System configuration and settings
- Analytics and reporting dashboard
- Database management capabilities
- Role switching for testing different user experiences

### 2. Staff (Administrative Personnel)
- Employee and HR management
- Payroll and benefits administration  
- User approval and role assignment (with permissions)
- Team and player management
- Schedule and event management
- News and communication management

### 3. Coach (Team Leadership)
- Team-specific player management
- Schedule management for assigned teams
- Player grading and evaluation
- Performance tracking and analytics
- Communication with players and parents
- Health monitoring (view-only for their teams)

### 4. Medical (Health Professionals)
- Complete health and wellness management
- Injury tracking and rehabilitation plans
- Medical appointments and clearances
- Health communications and alerts
- Return-to-play status management

### 5. Partner (Sponsors/Organizations)
- Partnership management dashboard
- Sponsorship tracking and analytics
- Communication with staff
- Event participation and visibility

### 6. Parent (Player Guardians)
- View children's profiles and performance
- Health and wellness monitoring
- Schedule and attendance tracking
- Communication with coaches and staff
- Payment and membership management

### 7. Player (Athletes)
- Personal performance dashboard
- Shot tracking and analysis
- Health and wellness logging
- Schedule viewing and attendance
- Communication access
- Goal setting and tracking

## Core Application Architecture

### Authentication & User Management
- Supabase Auth with email/password
- Profile completion flow for new users
- Admin approval system for new registrations
- Role-based access control (RBAC)
- Secure session management
- Password reset and profile management

### Navigation Structure

**Desktop Layout:**
- Collapsible sidebar navigation
- Header with user profile, notifications, and search
- Main content area with breadcrumb navigation
- Footer with app information and links

**Mobile Layout:**
- Bottom tab navigation for primary sections
- Hamburger menu for secondary features
- Swipe gestures for navigation
- Pull-to-refresh functionality

### Main Navigation Sections

1. **Home/Dashboard** - Role-specific overview
2. **Players** - Player management and profiles
3. **Teams** - Team organization and management
4. **Schedule** - Events, practices, and games
5. **Analytics** - Performance metrics and reports
6. **Health** - Medical and wellness tracking
7. **Chat** - Team and individual communication
8. **News** - Organization announcements and stories
9. **Settings** - User preferences and configuration

## Detailed Feature Specifications

### 1. Dashboard System

#### Super Admin Dashboard
- **User Management Metrics:**
  - Total users by role (cards with counts)
  - Pending approvals (actionable list)
  - Recent user activity (timeline)
  - System health indicators

- **Analytics Overview:**
  - Player performance trends (charts)
  - Team participation rates
  - System usage statistics
  - Revenue and membership tracking

- **Quick Actions Panel:**
  - Bulk user operations
  - System announcements
  - Backup and maintenance tools
  - Role switching controls

#### Player Dashboard
- **Performance Snapshot:**
  - Recent shot statistics (accuracy, makes, attempts)
  - Performance trend charts (weekly/monthly)
  - Goal progress indicators
  - Upcoming events and practices

- **Health & Wellness:**
  - Daily check-in status
  - Injury/recovery status
  - Fitness assessment scores
  - Medical appointment reminders

- **Quick Stats Cards:**
  - Total shots taken
  - Shooting percentage
  - Training sessions completed
  - Current streak/achievements

#### Coach Dashboard  
- **Team Overview:**
  - Team roster with quick stats
  - Attendance summary
  - Performance highlights
  - Upcoming schedule

- **Player Monitoring:**
  - Recent grades given
  - Players needing attention
  - Health status alerts
  - Performance trends

#### Parent Dashboard
- **Child Monitoring:**
  - Performance summaries
  - Health status updates
  - Attendance tracking
  - Communication history

### 2. Player Management System

#### Player Profiles
- **Basic Information:**
  - Personal details (name, DOB, contact)
  - Emergency contacts
  - Profile photo upload
  - Jersey number and position

- **Performance Metrics:**
  - Shot tracking statistics
  - Skill assessments and grades
  - Physical measurements
  - Performance history graphs

- **Health Records:**
  - Medical clearances
  - Injury history
  - Fitness assessments
  - Insurance information

#### Player List/Grid Views
- **Filterable Table:**
  - Search by name, team, position
  - Sort by various metrics
  - Bulk selection for operations
  - Export functionality

- **Card View:**
  - Profile photo and key stats
  - Quick action buttons
  - Status indicators (active, injured, etc.)
  - Team affiliation badges

#### Player Creation/Editing Modal
- **Multi-step Form:**
  - Step 1: Basic information validation
  - Step 2: Team assignments
  - Step 3: Health information
  - Step 4: Emergency contacts
  - Progress indicator and navigation

### 3. Shot Tracking & Analytics (ShotIQ)

#### Shot Session Management
- **Session Creation:**
  - Location and court selection
  - Training type specification
  - Duration and goals setting
  - Equipment setup instructions

#### AI-Powered Analysis
- **Video Analysis:**
  - Upload shot videos
  - AI technique evaluation
  - Form breakdown and scoring
  - Improvement recommendations

- **Photo Analysis:**
  - Shot form capture
  - Arc and release point analysis
  - Comparison with professional techniques
  - Progress tracking over time

#### Shot Chart Visualization
- **Interactive Court Map:**
  - Click-to-record shot locations
  - Make/miss tracking
  - Heat maps for accuracy zones
  - Shot selection analysis

#### Performance Analytics
- **Statistical Dashboards:**
  - Shooting percentage by zone
  - Volume and accuracy trends
  - Session comparison tools
  - Goal achievement tracking

### 4. Team Management

#### Team Creation & Configuration
- **Team Setup Form:**
  - Team name and age group
  - Season and league information
  - Coach assignments
  - Team colors and branding

#### Roster Management
- **Player Assignment:**
  - Add/remove players from teams
  - Position assignments
  - Captain and leadership roles
  - Substitution and rotation planning

#### Team Statistics
- **Performance Metrics:**
  - Team shooting averages
  - Individual player contributions
  - Attendance and participation rates
  - Win/loss records and trends

### 5. Schedule & Event Management

#### Event Creation
- **Event Types:**
  - Practices (team-specific)
  - Games (with opponent information)
  - Training sessions (skill-focused)
  - Team meetings and events

- **Event Configuration:**
  - Date, time, and duration
  - Location and facility details
  - Team assignments
  - Recurring event options

#### Attendance Tracking
- **Attendance Modal:**
  - Player list with status selection
  - Bulk status updates
  - Notes and comments section
  - Automatic membership deduction integration

- **Status Options:**
  - Present (deducts membership class)
  - Absent (no deduction)
  - Late (configurable deduction)
  - Excused (no deduction)

#### Schedule Views
- **Calendar Integration:**
  - Monthly, weekly, daily views
  - Team-specific filtering
  - Event details popup
  - Export to external calendars

### 6. Player Grading System

#### Grading Modal Interface
- **Skill Categories (17 total):**
  - Ball Handling, Shooting, Defense
  - Basketball IQ, Athleticism
  - Leadership, Communication
  - Work Ethic, Coachability
  - And 8 additional categories

- **Grading Interface:**
  - 1-10 scale sliders with haptic feedback
  - Real-time average calculation
  - Progress visualization
  - Comparison with previous grades

#### Grading Analytics
- **Performance Tracking:**
  - Grade history charts
  - Skill improvement trends
  - Team comparison metrics
  - Goal setting and achievement

### 7. Health & Wellness Management

#### Daily Check-ins
- **Health Questionnaire:**
  - Physical condition assessment
  - Pain or discomfort reporting
  - Sleep and nutrition tracking
  - Mental health indicators

#### Injury Reporting & Management
- **Injury Documentation:**
  - Incident details and severity
  - Photo documentation
  - Treatment recommendations
  - Recovery timeline tracking

#### Medical Appointments
- **Appointment Scheduling:**
  - Provider and facility selection
  - Insurance verification
  - Reminder notifications
  - Follow-up scheduling

#### Rehabilitation Plans
- **Recovery Programs:**
  - Exercise prescriptions
  - Progress milestones
  - Return-to-play protocols
  - Medical clearances

### 8. Membership Management

#### Membership Types
- **Configuration Options:**
  - Class-based memberships (specific number)
  - Time-based memberships (duration)
  - Unlimited memberships
  - Custom allocation rules

#### Usage Tracking
- **Automatic Deduction:**
  - Attendance-based class usage
  - Real-time balance updates
  - Overage notifications
  - Renewal reminders

#### Membership Assignment
- **Admin Controls:**
  - User-specific assignments
  - Bulk membership operations
  - Custom start/end dates
  - Override capabilities

### 9. Communication System

#### Chat Functionality
- **Chat Types:**
  - Direct messages (1-on-1)
  - Team group chats
  - Organization-wide announcements
  - Role-based channels

- **Message Features:**
  - Text messages with formatting
  - Photo and video sharing
  - Voice note recording
  - Location sharing
  - File attachments

#### Message Management
- **Advanced Features:**
  - Message editing (15-minute window)
  - Message recall (2-minute window)
  - Message forwarding
  - Read receipts and typing indicators

#### Notifications
- **Real-time Alerts:**
  - Push notifications for messages
  - Mention and reply notifications
  - Offline message queuing
  - Notification preferences

### 10. News Management System

#### News Creation
- **Rich Content Editor:**
  - WYSIWYG text editing
  - Photo and video integration
  - Gallery creation tools
  - SEO optimization features

#### Content Management
- **Publishing Workflow:**
  - Draft, review, publish states
  - Scheduled publishing
  - Category and tag management
  - Featured story designation

#### Analytics & Engagement
- **Performance Metrics:**
  - View counts and engagement
  - Reader demographics
  - Social sharing statistics
  - Content performance trends

### 11. Analytics & Reporting

#### Performance Dashboards
- **Player Analytics:**
  - Individual performance trends
  - Skill development tracking
  - Comparison with team averages
  - Goal achievement metrics

- **Team Analytics:**
  - Team performance summaries
  - Attendance and participation
  - Health and wellness trends
  - Communication engagement

#### System Analytics
- **Administrative Reports:**
  - User engagement metrics
  - System usage statistics
  - Revenue and membership data
  - Security and audit logs

### 12. HR & Employee Management

#### Employee Records
- **Staff Information:**
  - Personal and contact details
  - Role and department assignments
  - Compensation and benefits
  - Performance evaluations

#### Payroll Management
- **Payroll Processing:**
  - Time tracking integration
  - Deduction calculations
  - Tax and benefit processing
  - Direct deposit management

#### Benefits Administration
- **Benefits Management:**
  - Health insurance enrollment
  - Retirement plan administration
  - Paid time off tracking
  - Performance bonus calculations

### 13. Partner & Sponsorship Management

#### Partner Profiles
- **Organization Details:**
  - Company information and branding
  - Contact management
  - Partnership agreement terms
  - Sponsorship levels and benefits

#### Sponsorship Tracking
- **Financial Management:**
  - Sponsorship amount tracking
  - Payment schedule management
  - ROI and performance metrics
  - Contract renewal management

## Database Schema & Relationships

### Core Tables Structure

#### User Management
```sql
-- profiles: User basic information
-- user_roles: Role assignments with team associations
-- user_permissions: Granular permission assignments
```

#### Team & Player Management
```sql
-- teams: Team information and configuration
-- players: Player profiles and statistics
-- team_members: Team membership relationships
-- player_teams: Player-to-team assignments
```

#### Schedule & Attendance
```sql
-- schedules: Events and practices
-- attendance: Attendance tracking with status
-- locations: Venue and facility management
```

#### Performance & Grading
```sql
-- event_player_grades: Individual skill assessments
-- grading_metrics: Configurable grading categories
-- shots: Shot tracking data
-- shot_sessions: Training session records
```

#### Health & Medical
```sql
-- health_wellness: Daily check-in data
-- injury_reports: Injury documentation
-- medical_appointments: Healthcare scheduling
-- rehabilitation_plans: Recovery programs
```

#### Communication
```sql
-- chats: Chat room definitions
-- chat_participants: User participation in chats
-- chat_messages: Message content and metadata
-- message_reactions: Message reactions and emoji
```

#### Membership & Financial
```sql
-- membership_types: Membership plan definitions
-- player_memberships_v2: User membership assignments
-- membership_transactions: Usage and payment history
-- partner_organizations: Sponsor information
```

### Row Level Security (RLS) Implementation

#### Security Principles
- All tables have RLS enabled
- Role-based access patterns
- Team-based data isolation
- Admin override capabilities
- Audit logging for sensitive operations

#### Common RLS Patterns
```sql
-- Team member access
WHERE EXISTS (SELECT 1 FROM team_members WHERE user_id = auth.uid() AND team_id = target_team)

-- Role-based access  
WHERE has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid())

-- Self-access with role override
WHERE user_id = auth.uid() OR has_role(auth.uid(), 'staff'::user_role)
```

## UI/UX Design Specifications

### Design System Implementation

#### Color Usage Guidelines
- **Panthers Red:** Alerts, errors, and critical actions
- **Panther Gold:** Highlights, accents, and success states
- **Deep Teal:** Analytics charts and data visualization
- **Panther Blue:** Secondary actions and info states
- **Black:** Primary buttons and text
- **White:** Backgrounds and secondary text

#### Typography Hierarchy
```css
h1: text-4xl font-bold tracking-tight
h2: text-3xl font-bold tracking-tight  
h3: text-2xl font-semibold tracking-tight
h4: text-xl font-semibold
h5: text-lg font-medium
```

#### Component Styling
- **Rounded Corners:** 12px default radius
- **Soft Gold Shadows:** hsl(40 36% 52% / 0.4) for depth
- **Smooth Transitions:** 300ms ease-out for interactions
- **Touch Targets:** Minimum 44px for mobile accessibility

### Responsive Design Patterns

#### Mobile-First Approach
- Base styles for mobile (375px+)
- Tablet enhancements (768px+)
- Desktop optimizations (1024px+)
- Large screen adaptations (1440px+)

#### Component Responsiveness
- **Cards:** Single column mobile, grid layouts desktop
- **Tables:** Transform to card lists on mobile
- **Navigation:** Bottom tabs mobile, sidebar desktop
- **Modals:** Full-screen mobile, overlay desktop

### Interaction Patterns

#### Touch & Gesture Support
- **Swipe Navigation:** Between tabs and screens
- **Pull-to-Refresh:** Data reload on scroll top
- **Pinch-to-Zoom:** Chart and image scaling
- **Haptic Feedback:** Button taps and slider adjustments

#### Loading & Error States
- **Skeleton Screens:** Content placeholder loading
- **Progressive Loading:** Lazy load non-critical data
- **Error Boundaries:** Graceful error handling
- **Retry Mechanisms:** Automatic and manual retry options

## Real-time Features Implementation

### Supabase Real-time Integration

#### Real-time Subscriptions
```typescript
// Attendance updates
supabase.channel('attendance-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',  
    table: 'attendance'
  }, handleAttendanceUpdate)

// Chat messages
supabase.channel('chat-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages'
  }, handleNewMessage)
```

#### Live Data Updates
- Player performance metrics
- Chat message delivery
- Schedule and attendance changes
- Health status updates
- Notification delivery

### Performance Optimization

#### Data Fetching Strategies
- **React Query:** Caching and background updates
- **Optimistic Updates:** Immediate UI feedback
- **Background Sync:** Offline data synchronization
- **Pagination:** Large dataset management

#### Bundle Optimization
- **Code Splitting:** Route-based lazy loading
- **Tree Shaking:** Unused code elimination
- **Image Optimization:** WebP format with fallbacks
- **Service Workers:** Caching and offline support

## Security Implementation

### Authentication Security
- **JWT Tokens:** Secure session management
- **Role Verification:** Server-side permission checks
- **Session Timeouts:** Automatic logout after inactivity
- **Rate Limiting:** API request throttling

### Data Protection
- **Input Validation:** Client and server-side validation
- **SQL Injection Prevention:** Parameterized queries only
- **XSS Protection:** Content sanitization
- **CSRF Protection:** Token-based request verification

### Privacy Controls
- **Data Minimization:** Collect only necessary information
- **Access Logging:** Track data access for auditing
- **Data Retention:** Automatic cleanup of old data
- **User Consent:** Privacy preference management

## Production Deployment

### Infrastructure Requirements
- **Hosting:** Vercel for frontend deployment
- **Database:** Supabase PostgreSQL with backups
- **CDN:** Global content delivery network
- **Monitoring:** Error tracking and performance monitoring

### Performance Targets
- **Load Time:** <2 seconds initial page load
- **Interactivity:** <100ms response to user inputs
- **Mobile Performance:** >90 Lighthouse score
- **Accessibility:** WCAG 2.1 AA compliance

### Scalability Planning
- **Database Optimization:** Query performance tuning
- **Caching Strategy:** Multi-level caching implementation
- **Load Balancing:** Horizontal scaling preparation
- **Capacity Planning:** User growth projections

## Quality Assurance

### Testing Strategy
- **Unit Tests:** Component and function testing
- **Integration Tests:** API and database testing
- **E2E Tests:** Complete user journey testing
- **Performance Tests:** Load and stress testing

### Browser Compatibility
- **Modern Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers:** iOS Safari, Android Chrome
- **Progressive Enhancement:** Graceful degradation for older browsers

### Accessibility Requirements
- **Keyboard Navigation:** Full keyboard accessibility
- **Screen Reader Support:** ARIA labels and roles
- **Color Contrast:** WCAG AA compliant contrast ratios
- **Focus Management:** Clear focus indicators

## Implementation Priority

### Phase 1 (Core Foundation - Weeks 1-4)
1. Authentication and user management
2. Basic dashboard layouts
3. Player and team management
4. Schedule system with basic attendance

### Phase 2 (Advanced Features - Weeks 5-8)
1. Shot tracking and ShotIQ integration
2. Grading system implementation
3. Health and wellness management
4. Chat and communication system

### Phase 3 (Administrative Features - Weeks 9-12)
1. News management system
2. Analytics and reporting dashboards
3. HR and employee management
4. Partner and sponsorship management

### Phase 4 (Optimization & Polish - Weeks 13-16)
1. Performance optimization
2. Mobile app deployment
3. Advanced analytics features
4. Production hardening and security audits

This master prompt provides the complete specification for recreating the 100IN App with all current features, ensuring pixel-perfect recreation and production readiness. The implementation should follow this specification exactly to maintain consistency with the existing application architecture and user experience.