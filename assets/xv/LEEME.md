# Archivos de la invitación (assets/xv)

## Ya incluidos (extraídos del PDF, comprimidos para web)
| Archivo | Dónde se usa |
|---|---|
| papel.jpg | Textura de fondo de toda la página |
| foto-sobre.jpg | Foto que sale del sobre |
| foto-polaroid-1.jpg / foto-polaroid-2.jpg | Las dos polaroids inclinadas |
| foto-caballo.jpg | Foto horizontal a todo lo ancho |
| foto-final.jpg | Foto vertical del cierre |

Para cambiar una foto basta con reemplazar el archivo con el mismo nombre.

## Pendientes de exportar desde Illustrator
Exporta cada pieza **sola, con fondo transparente**, como SVG (o PNG con el mismo nombre
cambiando la extensión también en index.html). En cuanto el archivo existe, la página lo usa;
mientras no exista se ve un respaldo hecho en CSS.

| Archivo | Pieza del diseño | Si falta… |
|---|---|---|
| marco-contador.svg | Marco rosa de "Faltan:" (sin el texto) | marco CSS |
| marco-itinerario.svg | Marco alto del itinerario (sin textos ni íconos) | marco CSS |
| icono-misa.svg | Iglesia | ícono de línea incluido |
| icono-recepcion.svg | Mano con copa | ícono de línea incluido |
| marco-peticiones.svg | Óvalo de encaje (sin texto) | óvalo CSS |
| marco-regalos.svg | Nube rosa de "Mesa de regalos" (sin texto) | marco CSS |
| flor-sobre.svg | Flor de línea detrás del sobre | no se muestra |
| mariposas.svg | Mariposas junto al sobre | mariposas de línea incluidas |
| flor-1.svg | Lirios junto a "Peticiones especiales" | no se muestra |
| flor-2.svg | Lirios junto a "Mesa de regalos" | no se muestra |
| sello.svg | Sello de cera del sobre (cuadrado) | sello CSS con "ME" |
| forro-sobre.svg | Estampado interior de la solapa (rectangular, se recorta en triángulo) | degradado rosa |

Los marcos se estiran al tamaño del bloque, así que conviene exportarlos con proporciones
parecidas a las del diseño.

## Fuente
La letra de los textos del diseño es Century Schoolbook. Si tienen el archivo, ponlo en
`assets/fonts/CenturySchoolbook.ttf` y se usa solo. Si no, la página usa Libre Baskerville.
La letra manuscrita es MissFajardose (ya estaba en el proyecto).

## Configuración rápida (main.js → CONFIG)
- fechaEvento: fecha y hora del contador.
- mapsMisa: enlace de Google Maps de la iglesia (vacío = se oculta el botón).
- mapsRecepcion: enlace del salón.
