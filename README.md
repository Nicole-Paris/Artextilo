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

## Arquitectura 
<img width="386" height="604" alt="image" src="https://github.com/user-attachments/assets/800d49b8-12da-4268-a218-5df59bd14bce" />


## Modelo entidad-relacion
<img width="2329" height="1631" alt="Artextilov2 0_page-0001" src="https://github.com/user-attachments/assets/e4a2f732-8b3d-4599-88f7-241e783a6965" />





