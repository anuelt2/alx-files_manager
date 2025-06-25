# Files Manager

A scalable Node.js API that mimics basic cloud storage features like user registration, authentication, file uploading (including folders and images), access control, thumbnail generation, and more. Built with **Express**, **MongoDB**, **Redis**, **Bull**, and tested using **Mocha** and **Chai-HTTP**.

---

## Features

- User registration and authentication (Basic Auth + Redis sessions)
- File and folder uploads with ownership and type validation
- Public/private file toggling and secure access control
- Image thumbnail generation via Bull queue and worker
- Paginated file listing with filtering by parentId
- MIME type-based file download with optional resizing
- Mocha/Chai-HTTP tests for all modules and endpoints
