// Main JavaScript file for TypedMind website

// Mobile Navigation Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// Close mobile menu when clicking a link
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
  });
});

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.getAttribute('data-tab');
    
    // Remove active class from all buttons and panes
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Add active class to clicked button and corresponding pane
    button.classList.add('active');
    document.getElementById(`${targetTab}-tab`).classList.add('active');
  });
});

// Playground functionality
const codeEditor = document.getElementById('codeEditor');
const validateBtn = document.getElementById('validateBtn');
const validationOutput = document.getElementById('validationOutput');

// Playground syntax toggle
const playgroundToggle = document.querySelector('.editor-controls .code-toggle');
if (playgroundToggle) {
  const toggleButtons = playgroundToggle.querySelectorAll('.toggle-btn');
  
  // Store the current longform example
  const longformExample = codeEditor.value;
  
  // Shortform example  
  const shortformExample = `# Shortform syntax is for LLMs
TodoApp -> models v1.0.0

# Data Models
models @ models.ts:
  -> [Todo, CreateTodoInput]

Todo % "Todo entity"
  - id: string "Unique identifier"
  - title: string "Todo title"
  - completed: boolean "Completion status"
  - createdAt: Date "Creation timestamp"

CreateTodoInput % "Input for creating todos"
  - title: string "Todo title"
  - completed: boolean "Initial completion status"

# Service Layer
todoService @ services/todo.service.ts:
  <- [Todo, CreateTodoInput]
  -> [TodoService]

TodoService <: BaseService
  => [create, findAll, findById, update, delete]

create :: (input: CreateTodoInput) => Todo
  "Creates a new todo"
  <- CreateTodoInput
  -> Todo
  ~ [TodoList]

findAll :: () => Todo[]
  "Retrieves all todos"
  -> Todo

findById :: (id: string) => Todo
  "Finds todo by ID"
  -> Todo

update :: (id: string, input: CreateTodoInput) => Todo
  "Updates existing todo"
  <- CreateTodoInput
  -> Todo
  ~ [TodoItem]

delete :: (id: string) => void
  "Deletes a todo"
  ~ [TodoList]

# UI Components
TodoApp &! "Root todo application"
  > [TodoList, TodoForm]

TodoList & "List of todos"
  < [TodoApp]
  > [TodoItem]
  # Components affected by: [create, delete]

TodoItem & "Individual todo display"
  < [TodoList]
  # Components affected by: [update]

TodoForm & "Form for creating todos"
  < [TodoApp]
  # Components affected by: [create]`;
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      toggleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update editor content
      if (button.getAttribute('data-syntax') === 'longform') {
        codeEditor.value = longformExample;
      } else {
        codeEditor.value = shortformExample;
      }
      
      // Trigger validation
      const event = new Event('input');
      codeEditor.dispatchEvent(event);
    });
  });
}

// Stub validateTypedMind function for playground elements on index page
function validateTypedMind(code) {
  // This is a placeholder - real validation happens in playground.html
  return { isValid: true, errors: [] };
}

// Only add playground event listeners if elements exist
if (validateBtn && codeEditor) {
  validateBtn.addEventListener('click', () => {
    const code = codeEditor.value;
    const validation = validateTypedMind(code);
    displayValidationResult(validation);
  });

  // Auto-validate on typing (debounced)
  let validateTimeout;
  codeEditor.addEventListener('input', () => {
    clearTimeout(validateTimeout);
    validateTimeout = setTimeout(() => {
      const code = codeEditor.value;
      const validation = validateTypedMind(code);
      displayValidationResult(validation);
    }, 500);
  });
}

function displayValidationResult(validation) {
  if (!validationOutput) return;
  
  if (validation.isValid) {
    validationOutput.innerHTML = `
      <div class="validation-success">
        <span class="success-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span>Valid TypedMind syntax!</span>
      </div>
    `;
  } else {
    const errors = validation.errors.map(error => 
      `<div class="validation-error">• ${error}</div>`
    ).join('');
    
    validationOutput.innerHTML = `
      <div class="validation-errors">
        <strong>Validation Errors:</strong>
        ${errors}
      </div>
    `;
  }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = 80; // Account for fixed navbar
      const targetPosition = target.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Add active state to navigation based on scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

window.addEventListener('scroll', () => {
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (scrollY >= sectionTop - 100) {
      current = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href').substring(1) === current) {
      link.classList.add('active');
    }
  });
});

// Syntax toggle functionality
function setupSyntaxToggles() {
  const toggleContainers = document.querySelectorAll('.code-toggle');
  
  toggleContainers.forEach(container => {
    const buttons = container.querySelectorAll('.toggle-btn');
    const parentElement = container.parentElement;
    
    // Find longform and shortform code blocks within the same parent
    const longformCode = parentElement.querySelector('.longform-code');
    const shortformCode = parentElement.querySelector('.shortform-code');
    
    // Only set up the toggle if both code blocks are found
    if (longformCode && shortformCode) {
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Remove active class from all buttons in this container
          buttons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          // Show/hide appropriate code block
          const syntax = button.getAttribute('data-syntax');
          if (syntax === 'longform') {
            longformCode.style.display = 'block';
            shortformCode.style.display = 'none';
          } else if (syntax === 'shortform') {
            longformCode.style.display = 'none';
            shortformCode.style.display = 'block';
          }
        });
      });
    }
  });
}

// Initialize syntax toggles when page loads
document.addEventListener('DOMContentLoaded', setupSyntaxToggles);

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe feature cards and example cards
document.querySelectorAll('.feature-card, .example-card, .docs-card, .step').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});