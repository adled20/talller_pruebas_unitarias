const Carrito = require('./Carrito');

describe('Pruebas Mercado Sabanero', () => {
    let carrito;
    let mockInventario;

    beforeEach(() => {
        mockInventario = { consultarStock: jest.fn() };
        carrito = new Carrito(mockInventario);
    });

    describe('HU-01: Agregar productos', () => {
        test('CA1: Agrega producto válido al carrito', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            const prod = { id: 1, nombre: 'Pan', precio: 2000, iva: 0 };
            carrito.agregarProducto(prod, 10);
            expect(carrito.items[0].cantidad).toBe(10);
        });

        test('CA2: Lanza error si agrega 0 unidades (Límite)', () => {
            const prod = { id: 1, precio: 2000 };
            expect(() => carrito.agregarProducto(prod, 0)).toThrow("La cantidad debe estar entre 1 y 50 unidades");
        });

        test('CA2: Lanza error si agrega 51 unidades (Límite)', () => {
            const prod = { id: 1, precio: 2000 };
            expect(() => carrito.agregarProducto(prod, 51)).toThrow("La cantidad debe estar entre 1 y 50 unidades");
        });

        test('CA3: Informa stock insuficiente', () => {
            mockInventario.consultarStock.mockReturnValue(5);
            const prod = { id: 1, precio: 2000 };
            expect(() => carrito.agregarProducto(prod, 10)).toThrow("Stock insuficiente");
        });

        test('CA4: Suma cantidades si el producto ya existe', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            const prod = { id: 1, precio: 2000 };
            carrito.agregarProducto(prod, 5);
            carrito.agregarProducto(prod, 5);
            expect(carrito.items[0].cantidad).toBe(10);
        });
    });

    describe('HU-02: Calcular IVA (Pruebas Parametrizadas)', () => {
        test.each([
            [0, 0],
            [5, 500],
            [19, 1900]
        ])('CA1: Producto de 10000 con IVA %i% tiene un IVA de %i', (porcentaje, esperado) => {
            mockInventario.consultarStock.mockReturnValue(100);
            const prod = { id: 1, precio: 10000, iva: porcentaje };
            carrito.agregarProducto(prod, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo' });
            expect(liq.iva).toBe(esperado);
        });
    });

    describe('HU-03: Descuento por volumen (Pruebas Parametrizadas)', () => {
        test.each([
            [199999, 0],
            [200000, 10000],
            [499999, 25000],
            [500000, 50000]
        ])('CA1-3: Subtotal %i aplica descuento de %i', (precio, descEsperado) => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: precio, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo' });
            expect(liq.descuento).toBe(descEsperado);
        });
    });

    describe('HU-04: Cupones', () => {
        test('CA1: SABANERO10 aplica 10% si subtotal >= 50000', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 50000, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo' }, 'SABANERO10');
            expect(liq.descuento).toBe(5000);
        });

        test('CA2: ENVIOGRATIS deja envío en 0', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 10000, iva: 0 }, 1); // Menos de 150k para forzar cobro normal
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo' }, 'ENVIOGRATIS');
            expect(liq.envio).toBe(0);
        });

        test('CA3: Rechaza cupón inválido', () => {
            expect(() => carrito.liquidarCompra({}, 'FALSO')).toThrow("Cupón inválido");
        });
    });

    describe('HU-05: Envíos', () => {
        test('CA1: Sincelejo cuesta 8000', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 10000, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo' });
            expect(liq.envio).toBe(8000);
        });

        test('CA1: Sucre cuesta 15000', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 10000, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Corozal' });
            expect(liq.envio).toBe(15000);
        });

        test('CA2: Envío gratis si total con IVA >= 150000', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 150000, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo' });
            expect(liq.envio).toBe(0);
        });
    });

    describe('HU-06: Puntos', () => {
        test('CA1: 1 punto por cada 1000', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 10500, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo', categoria: 'ESTANDAR' });
            expect(liq.puntos).toBe(10); // 10500 + 8000 envio = 18500. Puntos sobre 10500 = 10. (Corregido a total pagado sin envío)
        });

        test('CA2: Cliente ORO recibe doble', () => {
            mockInventario.consultarStock.mockReturnValue(100);
            carrito.agregarProducto({ id: 1, precio: 10500, iva: 0 }, 1);
            const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo', categoria: 'ORO' });
            expect(liq.puntos).toBe(20); // 10 * 2
        });
    });

    test('Ejemplo Docente: Cliente ESTANDAR, Sincelejo, compra mixta', () => {
        mockInventario.consultarStock.mockReturnValue(100);
        carrito.agregarProducto({ id: 1, nombre: 'Licuadora', precio: 180000, iva: 19 }, 1);
        carrito.agregarProducto({ id: 2, nombre: 'Cafe', precio: 15000, iva: 5 }, 2);
        carrito.agregarProducto({ id: 3, nombre: 'Arroz', precio: 4500, iva: 0 }, 4);
        
        const liq = carrito.liquidarCompra({ ubicacion: 'Sincelejo', categoria: 'ESTANDAR' });
        
        expect(liq.subtotal).toBe(228000);
        expect(liq.descuento).toBe(11400);
        expect(liq.iva).toBe(33915);
        expect(liq.envio).toBe(0);
        expect(liq.totalAPagar).toBe(250515);
        expect(liq.puntos).toBe(250);
    });
});