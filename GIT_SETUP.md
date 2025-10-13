# Git Setup Instructions

## Prerequisites

1. Install Git from https://git-scm.com/downloads
2. During installation, make sure to select options to add Git to your PATH

## Initial Setup

After installing Git, configure your identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Repository Setup

Run these commands in the project directory:

```bash
# Initialize the Git repository
git init

# Add all files to Git
git add .

# Create the first commit
git commit -m "Initial commit"

# Add the remote origin
git remote add origin https://github.com/Qwertyysl/Prayer-Time-Firefox-extension-.git

# Rename the default branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Future Updates

To push future changes:

```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```