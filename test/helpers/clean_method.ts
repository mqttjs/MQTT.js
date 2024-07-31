import type { MqttClient } from 'src'
import { randomUUID } from 'node:crypto'
import serverBuilder from '../server_helpers_for_client_tests'

type ServerBuilderInstance = ReturnType<typeof serverBuilder>

type AddOptions = {
	/**
	 * @description
	 * If `true`, the method will be executed only one time and then removed from the store.
	 *
	 * @default true
	 */
	executeOnce?: boolean
}

type ResetMethodOptions = {
	/**
	 * @description
	 * If `true`, only the methods that have the option `executeOnce` set to `true` will be removed.
	 *
	 * @default false
	 */
	removeOnce?: boolean
}

type ResetOptions = {
	method?: ResetMethodOptions
}

/**
 * @description
 * Class to help clean the environment or close opened connections after tests finish.
 * Also, you can add custom methods to be executed after the tests finish, like
 * deleting temporary files or closing connections.
 *
 * @example
 * ```
 * import { describe, it } from 'node:test'
 * import mqtt from './src'
 * import serverBuilder from './test/server_helpers_for_client_tests'
 * import CleanMethod from './test/helpers/clean_method'
 *
 *
 * describe('Test', () => {
 *     const cleanMethod = new CleanMethod()
 *
 *     it('should clean the client and server', (t, done) => {
 *         t.after(async () => {
 *             await cleanMethod.closeClientAndServer()
 *         })
 *
 *         const server = serverBuilder('8883')
 *         const client = mqtt.connect('mqtt://localhost')
 *
 *         cleanMethod.setServer(server)
 *         cleanMethod.setClient(client)
 *     })
 * })
 * ```
 *
 * @example
 * ```
 * import { describe, it, after } from 'node:test'
 * import mqtt from './src'
 * import serverBuilder from './test/server_helpers_for_client_tests'
 * import CleanMethod from './test/helpers/clean_method'
 *
 *
 * describe('Test', () => {
 *
 *     const cleanMethod = new CleanMethod()
 *     let server = serverBuilder('8883')
 *
 *     cleanMethod.add({}, async () => {
 *         if (server?.listening) {
 *             await new Promise<void>((resolve, reject) => {
 *                 server.close((err) => {
 *                     if (err) reject(err)
 *                     else resolve()
 *                 })
 *             })
 *         }
 *     })
 *
 *     after(async () => {
 *         await cleanMethod.closeAllMethods()
 *     })
 *
 *     it('should clean the client and server', (t, done) => {
 *         server = serverBuilder('8883')
 *         const client = mqtt.connect('mqtt://localhost')
 *
 *         cleanMethod.setClient(client)
 *         done()
 *     })
 *
 * })
 * ```
 */
class CleanMethod {
	#client: MqttClient | null

	#server: ServerBuilderInstance | null

	#methods: Map<
		string,
		{
			options: AddOptions
			method: Promise<any> | ((...args: any[]) => Promise<any>)
			args: any[]
		}
	>

	constructor() {
		this.#client = null
		this.#server = null
		this.#methods = new Map()
	}

	/**
	 * @description
	 * Set the client to be used as default to close.
	 */
	setClient(client: MqttClient | null) {
		this.#client = client
	}

	/**
	 * @description
	 * Set the server to be used as default to close.
	 */
	setServer(server: ServerBuilderInstance | null) {
		this.#server = server
	}

	/**
	 * @param options Options to be passed to the method.
	 * @param method It can be a promise or a function that returns a promise.
	 * @param args Arguments to be passed to the method.
	 *
	 * @description
	 * Add a method to be executed
	 */
	add<T extends (...args: any[]) => Promise<void>>(
		options: AddOptions | undefined,
		method: Promise<void> | T,
		...args: Parameters<T>
	): string {
		const id = randomUUID()

		this.#methods.set(id, {
			method,
			args,
			options: { executeOnce: true, ...options },
		})

		return id
	}

	/**
	 *
	 * @description
	 * Restart the class to its initial state.
	 * Set the client and server to `null` and remove all methods stored.
	 */
	reset(options?: ResetOptions) {
		this.#client = null
		this.#server = null

		this.resetMethods(options?.method)
	}

	/**
	 * @description
	 * Remove all methods stored.
	 */
	resetMethods(options?: ResetMethodOptions) {
		if (options?.removeOnce) {
			for (const [id, { options: methodOptions }] of this.#methods) {
				if (methodOptions.executeOnce) {
					this.#methods.delete(id)
				}
			}
		} else {
			this.#methods.clear()
		}
	}

	/**
	 * @description
	 * Close the `client` connection.
	 *
	 * @default
	 * Use the `client` set in the class.
	 */
	async closeClient(client?: MqttClient | null) {
		const clientToClean = client ?? this.#client

		if (clientToClean) {
			await new Promise<void>((resolve, reject) => {
				clientToClean.end(true, (err) => {
					if (err) reject(err)
					else resolve()
				})
			})
		}
	}

	/**
	 * @description
	 * Close the `server` connection.
	 *
	 * @default
	 * Use the `server` set in the class.
	 */
	async closeServer(server?: ServerBuilderInstance | null) {
		const serverToClean = server ?? this.#server

		if (serverToClean?.listening) {
			await new Promise<void>((resolve, reject) => {
				serverToClean.close((err) => {
					if (err) reject(err)
					else resolve()
				})
			})
		}
	}

	/**
	 * @description
	 * Close the `client` and `server` connections.
	 *
	 * @default
	 * Use the `client` and `server` set in the class.
	 */
	async closeClientAndServer(options?: {
		client?: MqttClient | null
		server?: ServerBuilderInstance | null
	}) {
		await this.closeClient(options?.client)
		await this.closeServer(options?.server)
	}

	/**
	 * @param id Method id to be executed.
	 *
	 * @description
	 * Execute a method stored by its id
	 * If the method has the option `executeOnce` set to `true`, it will be removed after execution.
	 */
	async executeMethod(id: string) {
		const method = this.#methods.get(id)

		if (!method) {
			return
		}

		if (method.options.executeOnce) {
			this.#methods.delete(id)
		}

		if (method.method instanceof Promise) {
			await method.method
		} else {
			await method.method(...method.args)
		}
	}

	/**
	 * @description
	 * Execute all methods stored.
	 * If a method has the option `executeOnce` set to `true`, it will be removed after execution.
	 */
	async executeAllMethods() {
		if (this.#methods.size === 0) {
			return
		}

		const methods: Array<Promise<any>> = []

		for (const [id, { method, options, args }] of this.#methods) {
			if (method instanceof Promise) {
				methods.push(method)
			} else {
				const promise = new Promise<any>((resolve, reject) => {
					method(...args)
						.then(resolve)
						.catch(reject)
				})

				methods.push(promise)
			}

			if (options.executeOnce) {
				this.#methods.delete(id)
			}
		}

		const results = await Promise.allSettled(methods)

		for (const result of results) {
			if (result.status === 'rejected') {
				if (result.reason instanceof Error) throw result.reason
				else throw new Error(result.reason)
			}
		}
	}
}

export default CleanMethod
