# Restaurar Etapa 1 (estado estable)

**Etapa 1** es el punto del proyecto donde todo funciona correctamente:

- **Montar Ruta** en GIS FTTH y Corporativo, con opción Guardar en Firebase
- **Botón del sidebar** en el header (parte superior, izquierda, al lado de Home)
- **Apariencia en celular**: header en una fila, sidebar ajustado, botones girar solo en PC

## Cómo restaurar a Etapa 1 en el futuro

### Opción 1: Usar la etiqueta Git (recomendado)

Existe la etiqueta **`etapa1`** apuntando a este estado. Para restaurar:

```bash
git fetch --tags
git checkout etapa1
# O solo dejar la rama main en ese punto:
git reset --hard etapa1
git push --force origin main
```

### Opción 2: Usar el commit exacto

Commit de referencia para **Etapa 1**:

- **9e23068** – *Boton sidebar en header a la izquierda, al lado del boton Home*

Para volver a ese estado:

```bash
git reset --hard 9e23068
git push --force origin main
```

(En ese commit ya están incluidos Montar Ruta y los dos cambios del botón sidebar.)

### Opción 3: Buscar en el historial

```bash
git log --oneline -20
```

Busca el commit **"Boton sidebar en header a la izquierda"** o **"Montar Ruta en GIS FTTH y Corporativo"** y usa su hash.

---

*Documento creado para poder restaurar este estado estable si en el futuro se hacen cambios que se quieran deshacer.*
