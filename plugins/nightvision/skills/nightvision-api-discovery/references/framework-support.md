# Framework Support Matrix

Detailed component coverage per language and framework for NightVision API Discovery.

## Python (`--lang python`)

### Django
- `django.urls`: `path`, `re_path`, `include`
- `django.views.generic.View` - class-based views
- `django.http.QueryDict`, `HttpRequest`

### Django REST Framework
- Generic views: `CreateAPIView`, `ListAPIView`, `RetrieveAPIView`, `DestroyAPIView`, `ListCreateAPIView`, `RetrieveUpdateAPIView`, `RetrieveUpdateDestroyAPIView`
- `APIView`, `GenericAPIView`
- Mixins: `CreateModelMixin`, `DestroyModelMixin`, `ListModelMixin`, `RetrieveModelMixin`, `UpdateModelMixin`
- `ModelViewSet`, `ReadOnlyModelViewSet`
- `Serializer`, `Field` classes
- `ExtendedDefaultRouter`, `ExtendedSimpleRouter`

### Flask
- `flask.Flask`, `flask.Blueprint`
- `flask.request` (args, cookies, files, form, headers)
- `flask.views.View`, `MethodView`

### Flask-RESTful
- `flask_restful.Api`, `flask_restful.Resource`

### FastAPI
- `fastapi.FastAPI`, `fastapi.APIRouter`
- `pydantic.BaseModel` for request/response models
- `fastapi.Response`, `HTTPException`
- `fastapi.Header`, `fastapi.Cookie`
- `fastapi.status`

## Java (`--lang java`)

### Spring Boot
- `@RestController`, `@Controller`
- `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`
- `@RequestMapping`, `@PathVariable`, `@ResponseBody`
- `@RepositoryRestResource` - auto-generated CRUD routes
- `@RestResource`

### JAX-RS / Jersey
- `@GET`, `@POST`, `@PUT`, `@DELETE`, `@HEAD`, `@OPTIONS`
- `@Path`, `@PathParam`, `@QueryParam`, `@FormParam`
- `@ApplicationPath`
- `MediaType`, `@Context`

### Micronaut
- `@Controller`
- `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Head`, `@Options`, `@Trace`
- `@PathVariable`, `@QueryValue`, `@Header`, `@CookieValue`, `@Body`, `@Part`
- `@Consumes`, `@Produces`
- `@Secured`, `SecurityRule`

### Java EE / Jakarta EE
- `HttpServletRequest`, `HttpServletResponse`
- `@DenyAll`, `@PermitAll`, `@RolesAllowed`

## JavaScript (`--lang js`)

### Express
- `express.Router()`, `app.use()`, `app.route()`
- HTTP verbs: `get`, `post`, `put`, `patch`, `delete`, `all`
- `req.params`, `req.body`, `req.query`
- `app.listen()`

### NestJS
- `@nestjs/common`: `Controller`, `Module`, `Injectable`
- `@nestjs/core`: `DynamicModule`, `NestFactory.create`, `RouterModule.register`
- `setGlobalPrefix`, `listen`

### Fastify
- `@fastify.autoload`
- HTTP verbs: `get`, `head`, `post`, `put`, `delete`, `options`, `patch`
- `fastify.route`, `fastify.register`
- `fastify.listen`, `fastify.ready`

## C# (`--lang dotnet`)

### ASP.NET Core
- Controllers: `ApiController`, `Controller`, `ControllerBase`
- HTTP attributes: `HttpGet`, `HttpPost`, `HttpPut`, `HttpDelete`, `HttpPatch`, `HttpHead`, `HttpOptions`
- Parameter binding: `FromBody`, `FromHeader`, `FromQuery`, `FromRoute`
- Minimal APIs: `IEndpointRouteBuilder`, `MapControllers()`, `MapGroup()`
- Auth: `AddJwtBearer`, `AddCookie`, `AddOAuth`, `AddOpenIdConnect`, `Authorize`, `AllowAnonymous`
- Config: `WebApplication`, `WebApplicationBuilder`, `UseEndpoints()`, `UsePathBase()`

## Go (`--lang go`) - Experimental

### Gin
- `gin.New()`, `gin.Default()`
- Route groups: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `ANY`, `Handle`, `Group`
- Binding: `BindJSON`, `ShouldBind`, `ShouldBindJSON`
- Parameters: `Query`, `Param`, `PostForm`, `Cookie`

### httprouter
- `httprouter.New()`
- `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`

### net/http (standard library)
- `http.Request`: `FormValue`, `PostFormValue`, `Cookie`
- `http.ResponseWriter`
- `http.Server`, `ListenAndServe`

## Ruby (`--lang ruby`)

### Rails
- `ActionController::Base`
- Routing: `resources`, `resource`, `namespace`, `member`, `collection`
- HTTP verbs: `get`, `post`, `put`, `patch`, `delete`
- Strong parameters via `ActionController::Parameters`

### Grape
- `Grape::DSL::Routing`
- `resource`, `namespace`, `get`, `post`, `put`, `patch`, `delete`
- `mount`, `version`, `params`, `prefix`
