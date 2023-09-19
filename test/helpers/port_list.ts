/**
 * Method used to get ports for testing
 * @param i Index to shift the ports by
 * @returns
 */
export default function getPorts(i = 0) {
	const PORT = 10000 + i * 400
	const ports = {
		PORT,
		PORTAND40: PORT + 40,
		PORTAND41: PORT + 41,
		PORTAND42: PORT + 42,
		PORTAND43: PORT + 43,
		PORTAND44: PORT + 44,
		PORTAND45: PORT + 45,
		PORTAND46: PORT + 46,
		PORTAND47: PORT + 47,
		PORTAND48: PORT + 48,
		PORTAND49: PORT + 49,
		PORTAND50: PORT + 50,
		PORTAND72: PORT + 72,
		PORTAND103: PORT + 103,
		PORTAND114: PORT + 114,
		PORTAND115: PORT + 115,
		PORTAND116: PORT + 116,
		PORTAND117: PORT + 117,
		PORTAND118: PORT + 118,
		PORTAND119: PORT + 119,
		PORTAND316: PORT + 316,
		PORTAND326: PORT + 326,
		PORTAND327: PORT + 327,
		PORTAND400: PORT + 400,
	}

	return ports
}
