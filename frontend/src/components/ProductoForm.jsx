
import { useEffect, useState } from "react";
import "./ProductoForm.css";

function ProductoForm({
    productoEditar,
    categorias,
    onGuardar,
    onCancelar,
    guardando = false
}) {
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [idCategoria, setIdCategoria] = useState("");

    // Cargar los datos cuando se edita un producto
    useEffect(() => {
        if (productoEditar) {
            setNombre(productoEditar.nombre || "");
            setDescripcion(productoEditar.descripcion || "");
            setIdCategoria(String(productoEditar.id_categoria || ""));
        } else {
            setNombre("");
            setDescripcion("");
            setIdCategoria("");
        }
    }, [productoEditar]);

    // Enviar los datos del formulario al componente principal
    const manejarEnvio = (e) => {
        e.preventDefault();

        if (!nombre.trim()) {
            alert("Escribe el nombre del producto.");
            return;
        }

        if (!idCategoria) {
            alert("Selecciona una categoría.");
            return;
        }

        const datosProducto = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            id_categoria: Number(idCategoria)
        };

        onGuardar(datosProducto);
    };

    const categoriasActivas = categorias.filter(
        (categoria) => categoria.estado === "activo"
    );

    return (
        <div className="producto-form-overlay">
            <section
                className="producto-form-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="producto-form-titulo"
            >
                <header className="producto-form-header">
                    <div>
                        <p className="producto-form-subtitulo">
                            CATÁLOGO DE ARTESTILO
                        </p>

                        <h2 id="producto-form-titulo">
                            {productoEditar
                                ? "Editar producto"
                                : "Nuevo producto"}
                        </h2>

                        <p>
                            Completa la información de la prenda.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="producto-form-cerrar"
                        onClick={onCancelar}
                        disabled={guardando}
                        aria-label="Cerrar formulario"
                    >
                        ×
                    </button>
                </header>

                <form onSubmit={manejarEnvio}>
                    <div className="producto-form-campo">
                        <label htmlFor="form-producto-nombre">
                            Nombre del producto *
                        </label>

                        <input
                            id="form-producto-nombre"
                            type="text"
                            placeholder="Ej. Guayabera blanca"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="producto-form-campo">
                        <label htmlFor="form-producto-descripcion">
                            Descripción
                        </label>

                        <textarea
                            id="form-producto-descripcion"
                            placeholder="Describe el diseño o las características de la prenda"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="producto-form-campo">
                        <label htmlFor="form-producto-categoria">
                            Categoría *
                        </label>

                        <select
                            id="form-producto-categoria"
                            value={idCategoria}
                            onChange={(e) => setIdCategoria(e.target.value)}
                            required
                        >
                            <option value="">
                                Selecciona una categoría
                            </option>

                            {categoriasActivas.map((categoria) => (
                                <option
                                    key={categoria.id_categoria}
                                    value={categoria.id_categoria}
                                >
                                    {categoria.nombre}
                                </option>
                            ))}
                        </select>

                        {categoriasActivas.length === 0 && (
                            <p className="producto-form-ayuda">
                                Primero debes registrar o activar una categoría.
                            </p>
                        )}
                    </div>

                    <p className="producto-form-nota">
                        Los campos marcados con * son obligatorios.
                    </p>

                    <footer className="producto-form-acciones">
                        <button
                            type="button"
                            className="producto-form-btn-cancelar"
                            onClick={onCancelar}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="producto-form-btn-guardar"
                            disabled={guardando || categoriasActivas.length === 0}
                        >
                            {guardando
                                ? "Guardando..."
                                : productoEditar
                                    ? "Guardar cambios"
                                    : "Registrar producto"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

export default ProductoForm;