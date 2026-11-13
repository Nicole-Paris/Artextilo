# Artextilo

Sistema web para la gestión dpedidos, inventario, clientes, empleados, roles y sucursales de Artextilo

## Tecnologías usadas

* React 19 
* Vite 8
* Node.js  
* Express 5
* MySQL
* Docker y Docker Compose
* Git y Github 
* GitHub Actions


## Requisitos

- Node.js 22 o superior
- npm 10 o superior
- Docker y Docker Compose

## Estructura del repositorio

```text
.
├── backend/
│   ├── src/
│   │   ├── config/          
│   │   ├── lib/             
│   │   ├── middlewares/     
│   │   ├── modules/
│   │   │   ├── caja/       
│   │   │   ├── categorias/
│   │   │   ├── clientes/
│   │   │   ├── empleados/
│   │   │   ├── inventario/
│   │   │   ├── pedidos/     
│   │   │   ├── productos/
│   │   │   ├── roles/
│   │   │   └── sucursales/
│   │   ├── routes/          
│   │   ├── app.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             
│   │   ├── components/      
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/           
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── database/
│   ├── schema.sql           
│   └── seed.sql             
├── docker-compose.yml
├── package.json
└── README.md
```


### Instalación 

Para instalar y ejecutar el proyecto con los scripts:

```bash
npm run install:all
npm run dev:backend
npm run dev:frontend
```




