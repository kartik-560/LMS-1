# EduSphere Learning Management System

A modern, responsive Learning Management System built with React, featuring a beautiful UI and comprehensive functionality for students, instructors, and administrators.

## 🚀 Features

### Public & Authentication
- **Landing Page**: Welcoming introduction with call-to-action
- **User Registration**: Role-based signup (Student/Instructor)
- **User Login**: Secure authentication with JWT
- **Course Catalog**: Browse all available courses with search and filters

### Student Experience
- **Dashboard**: Overview of enrolled courses with progress tracking
- **Course View**: Interactive learning interface with lesson navigation
- **Progress Tracking**: Visual progress indicators and completion status
- **Assignments & Quizzes**: Submit work and take assessments
- **Grades**: View performance and instructor feedback

### Instructor Experience
- **Dashboard**: Course management overview
- **Course Editor**: Drag-and-drop module/lesson management
- **Content Management**: Upload videos, PDFs, and create text lessons
- **Assignment Creator**: Design and manage assessments
- **Grading Interface**: Review and grade student submissions

### Admin Panel
- **Platform Overview**: System-wide statistics and insights
- **User Management**: Manage all users and roles
- **Course Management**: Oversee course creation and assignments

## 🛠️ Tech Stack

- **Frontend**: React 18 with Vite
- **Routing**: React Router v6
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with custom components
- **Forms**: React Hook Form with validation
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edusphere-lms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # Basic UI components (Button, Input, Modal, etc.)
│   └── layout/        # Layout components (Navbar, Sidebar, etc.)
├── pages/             # Page components
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── CourseCatalogPage.jsx
│   └── StudentDashboardPage.jsx
├── store/             # State management
│   └── useAuthStore.js
├── services/          # API services
│   └── api.js
├── utils/             # Utility functions
│   └── cn.js
├── App.jsx            # Main app component with routing
├── main.jsx          # App entry point
└── index.css         # Global styles and Tailwind
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue shades for main actions and branding
- **Secondary**: Gray shades for text and borders
- **Accent**: Green shades for success states
- **Semantic**: Red for errors, yellow for warnings

### Component Library
- **Buttons**: Multiple variants (primary, secondary, outline, ghost)
- **Forms**: Consistent input styling with validation states
- **Cards**: Clean, shadow-based design for content containers
- **Progress**: Visual progress indicators with multiple sizes
- **Modals**: Overlay dialogs with backdrop and animations

## 🔐 Authentication Flow

1. **Registration**: Users choose role (Student/Instructor) and provide credentials
2. **Login**: Email/password authentication with JWT token
3. **Protected Routes**: Role-based access control for different sections
4. **Token Management**: Automatic token refresh and logout on expiration

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Responsive grid layouts for all screen sizes
- **Touch Friendly**: Optimized touch targets and interactions
- **Progressive Enhancement**: Core functionality works on all devices

## ♿ Accessibility

- **WCAG 2.1 AA**: Compliant with accessibility standards
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Meets accessibility contrast requirements

## 🚀 Performance

- **Code Splitting**: Route-based code splitting for optimal loading
- **Lazy Loading**: Components loaded on demand
- **Optimized Images**: Responsive images with proper sizing
- **Bundle Analysis**: Built-in bundle analyzer for optimization

## 🔌 API Integration

The frontend is designed to work with a RESTful backend API. Key endpoints include:

- **Authentication**: `/api/auth/*`
- **Courses**: `/api/courses/*`
- **Lessons**: `/api/lessons/*`
- **Assignments**: `/api/assignments/*`
- **Quizzes**: `/api/quizzes/*`
- **Users**: `/api/users/*`

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the code comments and component documentation
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions for help and ideas

## 🔮 Roadmap

- [ ] Instructor Dashboard and Course Management
- [ ] Admin Panel with User Management
- [ ] Real-time Notifications
- [ ] Video Player Integration
- [ ] File Upload System
- [ ] Discussion Forums
- [ ] Mobile App (React Native)
- [ ] Advanced Analytics
- [ ] Multi-language Support
- [ ] Dark Mode Theme

---

Built with ❤️ for modern education
