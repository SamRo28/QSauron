# Sistema de Inicio de Sesión Seguro - FrontPrueba

Este proyecto implementa un sistema de autenticación seguro en Angular que se comunica con el backend reper para gestionar usuarios. **El diseño visual está completamente alineado con la interfaz de Qumuclient/Frontend** para mantener consistencia en el ecosistema.

## Características

- ✅ **Autenticación JWT**: Tokens seguros para mantener las sesiones
- ✅ **Registro de usuarios**: Creación de cuentas nuevas
- ✅ **Login seguro**: Validación de credenciales
- ✅ **Guards de rutas**: Protección de páginas privadas
- ✅ **Interceptor HTTP**: Inyección automática de tokens
- ✅ **Validación de formularios**: Validación reactiva con Angular Forms
- ✅ **Diseño responsivo**: Interfaz adaptable a móviles y desktop
- ✅ **Manejo de errores**: Gestión completa de errores del backend
- ✅ **Tema visual unificado**: Colores y estilos consistentes con Qumuclient

## Paleta de Colores (Qumuclient Theme)

El sistema utiliza la misma paleta de colores que Qumuclient/Frontend:

- **Verde Principal**: `#50816f` - Color primario para fondos y elementos principales
- **Verde Mint**: `#9dc0a9` - Para botones y elementos interactivos
- **Verde Hover**: `#8ab095` - Estados de hover y efectos
- **Verde Borde**: `#718f84` - Bordes y divisores
- **Gris Oscuro**: `#1f2937` - Texto principal
- **Gris Medio**: `#4c5866` - Headers y títulos
- **Fondo Claro**: `#f0f7f3` - Fondo general de la aplicación

## Estructura del Proyecto

```
src/app/
├── components/
│   ├── login/                 # Componente de inicio de sesión
│   ├── register/              # Componente de registro
│   ├── dashboard/             # Página protegida (ejemplo)
│   └── spinner/               # Componente de carga
├── services/
│   └── auth.service.ts        # Servicio de autenticación
├── guards/
│   └── auth.guard.ts          # Guard para proteger rutas
├── interceptors/
│   └── auth.interceptor.ts    # Interceptor para tokens JWT
├── styles/
│   └── variables.css          # Variables CSS del tema
└── app.routes.ts              # Configuración de rutas
```

## Requisitos Previos

1. **Backend reper** ejecutándose en `http://localhost:8080`
2. El backend debe tener los siguientes endpoints disponibles:
   - `POST /users/create` - Crear usuario
   - `POST /users/login` - Iniciar sesión

## Instalación y Configuración

### 1. Instalar dependencias
```bash
cd "Repository_Project/FrontPrueba/nombre-del-proyecto"
npm install
```

### 2. Configurar el backend
Asegúrate de que el proyecto reper esté ejecutándose:
```bash
# En el directorio del backend reper
mvn spring-boot:run
```

### 3. Ejecutar el frontend
```bash
npm start
# o
ng serve
```

La aplicación estará disponible en `http://localhost:4200`

## Uso del Sistema

### Registro de Usuario
1. Navega a `/register`
2. Completa el formulario con:
   - Email válido
   - Contraseña (mínimo 6 caracteres)
   - Confirmación de contraseña
3. Click en "Crear Cuenta"

### Inicio de Sesión
1. Navega a `/login`
2. Ingresa tus credenciales:
   - Email
   - Contraseña
3. Click en "Iniciar Sesión"

### Navegación Protegida
- Una vez autenticado, serás redirigido al Dashboard
- Las rutas protegidas requieren autenticación
- El token se almacena automáticamente en localStorage
- El sistema redirige al login si el token expira o no existe

## API Endpoints del Backend

### POST /users/create
Crear un nuevo usuario.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "pwd": "contraseña123"
}
```

**Responses:**
- `200`: Usuario creado exitosamente
- `409`: Usuario ya existe
- `500`: Error interno del servidor

### POST /users/login
Iniciar sesión de usuario.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "pwd": "contraseña123"
}
```

**Responses:**
- `200`: Token JWT (texto plano)
- `403`: Credenciales inválidas

## Características de Seguridad

### Almacenamiento de Tokens
- Los tokens JWT se almacenan en `localStorage`
- Se limpian automáticamente al cerrar sesión
- Compatible con SSR (verificación de `window`)

### Interceptor de Autenticación
- Inyecta automáticamente el token `Authorization: Bearer <token>`
- Aplica a todas las peticiones HTTP

### Guards de Rutas
- Protege rutas que requieren autenticación
- Redirige a `/login` si no hay token válido
- Preserva la URL de destino para redirección post-login

### Validación de Formularios
- Validación en tiempo real
- Validación de formato de email
- Validación de longitud de contraseña
- Confirmación de contraseña

## Personalización

### Cambiar URL del Backend
Edita `auth.service.ts`:
```typescript
private readonly API_URL = 'http://tu-servidor:puerto/users';
```

### Modificar Rutas
Edita `app.routes.ts` para agregar nuevas rutas protegidas:
```typescript
{ path: 'nueva-ruta', component: TuComponente, canActivate: [authGuard] }
```

### Personalizar Estilos
Los componentes tienen sus propios archivos CSS que puedes modificar:
- `login.component.css`
- `register.component.css`
- `dashboard.component.css`

## Solución de Problemas

### Error de CORS
Si encuentras errores de CORS, configura el backend para permitir:
```java
@CrossOrigin(origins = "http://localhost:4200")
```

### Token No Válido
Si el token expira o es inválido:
- El usuario será redirigido automáticamente al login
- Los datos de sesión se limpiarán automáticamente

### Error de Conexión
Verifica que:
- El backend esté ejecutándose en el puerto correcto
- La URL en `auth.service.ts` sea correcta
- No hay problemas de red o firewall

## Desarrollo

### Estructura de Componentes
Todos los componentes son **standalone components** usando la nueva sintaxis de Angular.

### Testing
Para ejecutar las pruebas:
```bash
npm test
```

### Build de Producción
```bash
npm run build
```

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.
