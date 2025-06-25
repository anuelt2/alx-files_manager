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

---

## Dependencies

Compatible with:

- ***Node.js v12+***
  - `"express": "^4.17.1"`
  - `"mongodb": "^3.5.9"`
  - `"redis": "^2.8.0"`
  - `"bull": "^3.16.0"`
  - `"chai-http": "^4.3.0"`
  - `"uuid": "^8.2.0"`
  - `"image-thumbnail": "^1.0.10"`
  - `"mime-types": "^2.1.27"`
  - `"sha1": "^1.1.1"`
- ***MongoDB***
- ***Redis***

---

##   Environment Variables

Create a `.env` file or export these:

| Variable         | Description                            | Default                |
|------------------|----------------------------------------|------------------------|
| `PORT`           | Port API listens on                    | `5000`                 |
| `DB_HOST`        | MongoDB hostname                       | `localhost`            |
| `DB_PORT`        | MongoDB port                           | `27017`                |
| `DB_DATABASE`    | MongoDB database name                  | `files_manager`        |
| `REDIS_HOST`     | Redis hostname                         | `localhost`            |
| `REDIS_PORT`     | Redis port                             | `6379`                 |
| `FOLDER_PATH`    | Path for file storage                  | `/tmp/files_manager`   |

---
