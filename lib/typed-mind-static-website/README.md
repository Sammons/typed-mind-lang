# TypedMind Playground

An interactive web IDE for the TypedMind Domain Specific Language (DSL) - a powerful language for creating AI agent workflows and system architectures.

## What is TypedMind Playground?

TypedMind Playground is an interactive web-based development environment that allows you to:

- **Write and test TypedMind DSL code** with syntax highlighting and real-time validation
- **Explore comprehensive examples** of TypedMind syntax and patterns
- **Learn the language** through interactive documentation and guides
- **Experiment safely** in a browser-based sandbox environment

## Features

- **Monaco Editor Integration**: Full-featured code editor with TypedMind syntax highlighting
- **Real-time Validation**: Instant feedback on syntax errors and validation issues
- **Interactive Examples**: Pre-loaded examples demonstrating various TypedMind patterns
- **Modern UI**: Clean, developer-friendly interface with dark mode support
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **No Installation Required**: Runs entirely in your browser

## Live Demo

Visit the live playground at: **[https://typedmind.sammons.io](https://typedmind.sammons.io)**

## Development

### Prerequisites

- Node.js 20 or higher
- npm or pnpm

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run serve

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Project Structure

```
lib/typed-mind-static-website/
├── src/               # Source HTML files
├── assets/           
│   ├── css/          # Stylesheets
│   └── js/           # JavaScript files
├── dist/             # Built files (GitHub Pages ready)
├── build.js          # Build script
└── package.json      # Project configuration
```

## GitHub Pages Deployment

This project is configured for easy deployment to GitHub Pages:

1. **Automatic Deployment**: Push to main branch triggers automatic deployment
2. **Custom Domain Ready**: Configure custom domain in repository settings
3. **Optimized Build**: All assets are properly minified and optimized
4. **Relative Paths**: All links work correctly in subdirectory deployments

## Configuration

### Meta Tags

Edit the meta tags in `src/index.html` to customize social sharing:

- Open Graph tags for Facebook
- Twitter Card tags
- Structured data for search engines

### Analytics

To add analytics, insert your tracking code before the closing `</body>` tag in `src/index.html`.

### Content Updates

- **Examples**: Update the examples in the Examples Gallery section
- **Documentation**: Modify the syntax guide tabs
- **Features**: Edit the feature cards in the Overview section

## Performance Optimization

The site is optimized for Core Web Vitals:

- **LCP**: Hero content loads immediately
- **FID**: Minimal JavaScript for fast interactivity
- **CLS**: Fixed dimensions prevent layout shifts

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT License - see the main project LICENSE file