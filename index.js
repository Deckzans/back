//Importaciones utilizadas en el proyecto 
const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Asignacion de variable al framework express
const app = express();

//Asignacion de puerto en expresss
const port = process.env.PORT || 5000;

//Conexion a base de datos
const db = mysql.createConnection({
	host: "localhost",
	user: "root",
	database: "audioapp",
	password: "",
});


//Uso de Middelwares en App
app.use(bodyParser.json());
app.use(cors());
app.use(fileUpload());
app.use('/img', express.static(__dirname + '/imagenes'));


//Middelwares aplicacion
const verifyJWT = (req, res, next) => {
	const token = req.headers["x-access-token"];
	if (!token) {
		res.status(200).send({
			codigo: 1,
			mensaje: "no existe el token",
		})
	} else {
		jwt.verify(token, "jwtSecret", (err, decoded) => {
			if (err) {
				res.status(200).send({
					codigo: 2,
					mensaje: "fallo la autentificación del token",
				})
			} else {
				req.auth = true;
				req.userId = decoded.email;
				req.tipo = decoded.tipo;
				next();
			}
		})
	}
}

///Middelware para borrar foto 
const eliminarFoto = (foto) => {
	var fs = require("fs");
	fs.stat(`./imagenes/avatar/${foto}`, (err, stats) => {
		if (err || foto === 'default.png') {
			return (console.log(err));
		}
		fs.unlink(`./imagenes/avatar/${foto}`, (err) => {
			if (err) {
				return (console.log(err));
			}
		});
	})
}

//Solicitud al servidor 
app.get('/', (req, res) => {
	res.send("hola mundo");
});


//Solicitud traer todos los amplificadores
app.get('/amplificadores', (req, res) => {

	const sql = 'SELECT * FROM amplificadores';
	db.query(sql, (err, result) => {
		if (!err) {
			res.status(200).send(result);
		} else {
			res.status(400).send(err);
		}
	})

});

//Solicitud traer un amplificador
app.get('/amplificadores/:nombre', (req, res) => {

	const nombre = '%' + req.params.nombre + '%';

	const sql = "SELECT * FROM amplificadores WHERE nombre LIKE ?";
	db.query(sql, [nombre], (err, result) => {
		if (!err) {
			res.status(200).send(result);
		} else {
			res.status(400).send(err);
		}
	})
});

//Solicitud agregar amplificador
app.post('/amplificador/agregar', verifyJWT, (req, res) => {
	const { clave, nombre, linea, modelo, marca, potencia, clase, canales, precio, color, cantidad, descripcion } = req.body;

	const sql = 'INSERT INTO amplificadores VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
	db.query(sql, [clave, nombre, linea, modelo, marca, potencia, clase, canales, precio, color, cantidad, descripcion, 'default.png'], (err, result) => {
		if (!err) {
			res.send({
				status: 200,
				result
			})
		} else {
			res.send({
				status: 100,
				err
			})
		}
	});
});

//Solicitud borrar 1 amplificador
app.get('/amplificador/eliminar/:clave', (req, res) => {
	const { clave } = req.params;

	const sql = 'DELETE FROM amplificadores WHERE clave=?';
	db.query(sql, [clave], (err, result) => {
		if (!err) {
			res.send({
				status: 200,
				result,
				mensaje: 'Amplificador eliminado',
			})
		} else {
			res.send({
				status: 100,
				err,
				mensaje: 'no fue posible eliminar',
			})
		}
	});
});


//Solicitud traer amplificador con clave
app.get('/amplificador/traer/:clave', (req, res) => {
	const { clave } = req.params;

	const sql = 'SELECT * FROM amplificadores WHERE clave = ?';
	db.query(sql, [clave], (err, result) => {
		if (!err) {
			res.status(200).send(result);
		} else {
			res.status(400).send(err);
		}
	})

});

//Solicitud modificar amplificador
app.post('/amplificador/modificar', (req, res) => {
	const { clave, nombre, linea, modelo, marca, potencia, clase, canales, precio, color, cantidad, descripcion } = req.body;

	const sql = 'UPDATE amplificadores SET nombre=?, linea=?, modelo=?, marca=?, potencia=?, clase=?, canales=?, precio=?, color=?, cantidad=?, descripcion=? WHERE clave = ?';
	db.query(sql, [nombre, linea, modelo, marca, potencia, clase, canales, precio, color, cantidad, descripcion, clave], (err, result) => {
		if (!err) {
			res.send({
				status: 200,
				result
			})
		} else {
			res.send({
				status: 100,
				err
			})
		}
	});
});

//Solicitud para subir foto a un amplificador
app.post('/amplificador/foto/subir', (req, res) => {
	const file = req.files;
	const { clave, foto } = req.body;
	eliminarFoto(foto);
	if (!file) {
		return (
			res.status(101).send({
				mensaje: 'no se adjunto fotografia',
			})
		)
	}
	const archivo = req.files.imagen;
	const nombreArchivo = clave + path.extname(archivo.name);
	const nombreArchivo2 = (foto === nombreArchivo) ? clave + '_1' + path.extname(archivo.name) : nombreArchivo;
	const uploadPath = __dirname + '/imagenes/avatar/' + nombreArchivo2;
	archivo.mv(uploadPath, (err) => {
		if (err) {
			return (
				res.status(101).send({
					mensaje: 'no fue posible subir la fotografia - contacte al administrador',
				})
			)
		}
		const sql = 'UPDATE amplificadores SET foto = ? WHERE clave = ?';
		db.query(sql, [nombreArchivo2, clave], (err1, result1) => {
			if (err1) {
				return (
					res.status(102).send({
						mensaje: 'Se ha subido la fotografia',
						mensajeFoto: 'no fue posible actualizar la BD - contacta al administrador',
						resulta: err1,
					})
				)
			}
			if (result1) {
				return (
					res.status(200).send({
						mensaje: 'Se ha subido la fotografia',
						mensajeFoto: 'se ha actualizado la BD',
						resulta: result1,
					})
				)
			}

		})
	});



});


//Agregar usuario 
app.post('/administradores/agregar', (req, res) => {
	const { email, nombre, descripcion, foto, password, tipo } = req.body;

	bcrypt.hash(password, 10, (err, hash) => {
		if (err) {
			res.send({
				status: 100,
				resultado: err,
			});
		}
		const sql = "INSERT INTO administradores VALUES (?,?,?,?,?,?)";
		db.query(
			sql,
			[email, nombre, descripcion, "default.png", hash, tipo],
			(err1, result) => {
				if (!err1) {
					res.send({
						status: 200,
						resultado: result,
					});
				} else {
					res.send({
						status: 100,
						resultado: err1,
					});
				}
			}
		);
	});
});


//Ingresar usuario
app.post('/usuarios/ingresar', (req, res) => {
	const { email, password } = req.body;
	const sql = "SELECT * FROM administradores WHERE email=?";
	db.query(sql, [email], (error, result) => {
		if (error) {
			res.status(200).send({
				resultado: 0,
			})
		} else {
			if (result.length > 0) {
				bcrypt.compare(password, result[0].password, function (error1, result1) {
					if (error1) {
						res.status(200).send({
							resultado: 1,
						});
					} else {
						if (result1) {
							const token = jwt.sign({
								email: result[0].email,
								nombre: result[0].nombre,
								tipo: result[0].tipo
							}, "jwtSecret", { expiresIn: "1 day" })
							res.status(200).send({
								resultado: 2,
								email: result[0].email,
								nombre: result[0].nombre,
								tipo: result[0].tipo,
								foto: result[0].foto,
								token
							});
						} else {
							res.status(200).send({
								resultado: 3,
							});
						}

					}
				});
			} else {
				res.status(200).send({
					resultado: 4,
				})
			}

		}
	});
});

//Agregar al carrito
app.post('/carrito/agregar', verifyJWT, (req, res) => {
	const { email, clave_amp, nombre_amp, descripcion_amp, foto_amp, precio_amp } = req.body;
	const sql = 'INSERT INTO carrito (email, clave_amp, nombre_amp, descripcion_amp, foto_amp, precio_amp, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
	db.query(sql, [email, clave_amp, nombre_amp, descripcion_amp, foto_amp, precio_amp, 1, precio_amp], (err, result) => {
		if (!err) {
			res.send({
				status: 200,
				result
			});
		} else {
			res.send({
				status: 100,
				err
			});
		}
	});

});

//carrito totoal

app.get('/carrito/calculartotal/:correo', verifyJWT, (req, res) => {
	const { correo } = req.params;

	const sql = "SELECT SUM(subtotal) AS total FROM carrito WHERE email=?";
	db.query(sql,
		[correo],
		(err1, result) => {
			if (!err1) {
				res.send({
					status: 200,
					resultado: result,
				});
			} else {
				res.send({
					status: 100,
					resultado: err1,
				});
			}
		}
	)
})

//Eliminar carrito 
app.post('/carrito/eliminar', verifyJWT, (req, res) => {
	const { id } = req.body;
	const sql = 'DELETE FROM carrito WHERE id=?';
	db.query(
		sql,
		[id],
		(err1, result) => {
			if (!err1) {
				res.send({
					status: 200,
					resultado: result,
				});
			} else {
				res.send({
					status: 100,
					resultado: err1
				});
			}
		}
	)
})

//Agregar Cantidad en carrito 
app.post('/carrito/agregarcantidad', verifyJWT, (req, res) => {
	const { id } = req.body;
	const sql = 'UPDATE carrito SET cantidad = cantidad+1, subtotal= cantidad*precio_amp where id=? ';
	db.query(
		sql,
		[id],
		(err1, result) => {
			if (!err1) {
				res.send({
					status: 200,
					resultado: result,
				});
			} else {
				res.send({
					status: 100,
					resultado: err1
				});
			}
		}
	)
})


//Quitar Cantidad en carrito 
app.post('/carrito/quitarcantidad', verifyJWT, (req, res) => {
	const { id } = req.body;
	const sql = 'UPDATE carrito SET cantidad = if(cantidad>1, cantidad-1,cantidad),  subtotal= cantidad*precio_amp where id=? ';
	db.query(
		sql,
		[id],
		(err1, result) => {
			if (!err1) {
				res.send({
					status: 200,
					resultado: result,
				});
			} else {
				res.send({
					status: 100,
					resultado: err1
				});
			}
		}
	)
})


//Obtener productos
app.get('/productos/:id', verifyJWT, (req, res) => {
	const { id } = req.params;

	const sql = 'select * from carrito where email = ?';
	db.query(sql, [id], (err, result) => {
		if (!err) {
			res.status(200).send(result);
		} else {
			res.status(400).send(err);
		}
	})
});


app.listen(port, () => {
	console.log(`Escuchando por el puerto ${port}`);
});