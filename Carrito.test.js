
describe('Aportes del Compañero (HU-01 y HU-05)', () => {
    let carritoComp;
    let mockInvComp;
    beforeEach(() => {
        mockInvComp = { consultarStock: jest.fn() };
        carritoComp = new Carrito(mockInvComp);
    });
    test('HU-01: Validar que rechaza cantidades negativas estrictamente', () => {
        expect(() => carritoComp.agregarProducto({ id: 1, precio: 1000 }, -5)).toThrow('La cantidad debe estar entre 1 y 50 unidades');
    });
    test('HU-05: Validar que el costo de envío a municipios distintos a Sincelejo cobra ', () => {
        mockInvComp.consultarStock.mockReturnValue(100);
        carritoComp.agregarProducto({ id: 1, precio: 10000, iva: 0 }, 1);
        const liq = carritoComp.liquidarCompra({ ubicacion: 'Toluviejo' });
        expect(liq.envio).toBe(15000);
    });
});
