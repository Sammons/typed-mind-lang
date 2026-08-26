# TypedMind DSL Examples

This directory contains various examples demonstrating different features of the TypedMind DSL.

## Example Files

### 📁 `example.tmd`
The main comprehensive example showing a complete todo application architecture using composition over inheritance. Demonstrates:
- File and class structure
- Service layer architecture  
- DTO definitions with validation
- Function composition patterns
- Comment usage

### 📁 `dto-example.tmd`
Focused example demonstrating DTO (Data Transfer Object) features:
- DTO definitions with purpose descriptions
- Field types, descriptions, and optional markers
- Function input/output DTO references
- Validation workflows

### 📁 `comment-example.tmd`
Simple example showcasing comment functionality:
- Inline comments on entity declarations
- Continuation comments on separate lines
- Comment display in IDE hover tooltips

### 📁 `example-fixed.tmd`
Clean architecture example with proper composition patterns and complete entity relationships.

### 📁 `example-with-methods.tmd`
Example showing method implementation details and service layer patterns.

## DSL Features Demonstrated

- **Entity Types**: Program, File, Function, Class, Constants, DTO
- **Relationships**: Imports, exports, method calls, inheritance
- **Data Types**: DTOs with rich field definitions
- **Documentation**: Comments and descriptions
- **Validation**: Comprehensive error checking and suggestions

## Usage

Use these examples as templates for your own architecture specifications:

```bash
# Validate an example
node lib/typed-mind-cli/dist/cli.js --check examples/example.tmd

# Generate interactive visualization
node lib/typed-mind-cli/dist/cli.js --render examples/example.tmd

# Generate static HTML output
node lib/typed-mind-cli/dist/cli.js --render examples/example.tmd --output my-architecture.html
```

## VS Code Extension

Install the TypedMind VS Code extension for:
- Syntax highlighting
- Real-time validation
- Hover information with comments and DTO details
- Go to definition and find references
- Auto-completion