import type { MqttClient } from 'src'
import { randomUUID } from 'node:crypto'
import { isAsyncFunction } from 'node:util/types'
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
	/**
	 * @description
	 * The order in which the method will be executed.
	 * If `order===0` the method will be executed after all methods before it that were added.
	 *
	 * @default 0
	 */
	order?: number
}

type ResetOptions = {
	/**
	 * @description
	 * If `true`, only the methods that have the option `executeOnce` set to `true` will be removed.
	 *
	 * @default false
	 */
	removeOnce?: boolean
}

type Method =
	| Promise<any>
	| ((...args: any[]) => Promise<any>)
	| ((...args: any[]) => any)

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
 * import TeardownHelper from './test/helpers/TeardownHelper'
 *
 *
 * describe('Test', () => {
 *     const teardownHelper = new TeardownHelper()
 *
 *     it('should clean the client and server', (t, done) => {
 *         t.after(async () => {
 *             await teardownHelper.runAll()
 *         })
 *
 *         const server = serverBuilder('8883')
 *         const client = mqtt.connect('mqtt://localhost')
 *
 *         teardownHelper.addServer(server)
 *         teardownHelper.addClient(client)
 *     })
 * })
 * ```
 *
 * @example
 * ```
 * import { describe, it, after } from 'node:test'
 * import mqtt from './src'
 * import serverBuilder from './test/server_helpers_for_client_tests'
 * import TeardownHelper from './test/helpers/TeardownHelper'
 *
 *
 * describe('Test', () => {
 *
 *     const teardownHelper = new TeardownHelper()
 *     let server = serverBuilder('8883')
 *
 *     teardownHelper.add({}, async () => {
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
 *         await teardownHelper.runAll()
 *     })
 *
 *     it('should clean the client and server', (t, done) => {
 *         server = serverBuilder('8883')
 *         const client = mqtt.connect('mqtt://localhost')
 *
 *         teardownHelper.addClient(client)
 *         done()
 *     })
 *
 * })
 * ```
 */
class TeardownHelper {
	#methods: Map<
		string,
		{
			options: AddOptions
			method: Method
			args: any[]
		}
	>

	constructor() {
		this.#methods = new Map()
	}

	/**
	 * @description
	 * Add a client to close.
	 */
	addClient(client: MqttClient) {
		this.add({}, this.closeClient, client)
	}

	/**
	 * @description
	 * Add a server to close.
	 */
	addServer(server: ServerBuilderInstance) {
		this.add({}, this.closeServer, server)
	}

	/**
	 * @param options Options to be passed to the method.
	 * @param method It can be a promise or a function that returns a promise.
	 * @param args Arguments to be passed to the method.
	 *
	 * @description
	 * Add a method to be executed
	 */
	add<T extends any[] = []>(
		options: AddOptions | undefined,
		method: Method,
		...args: T
	): string {
		const id = randomUUID()

		this.#methods.set(id, {
			method,
			args,
			options: { executeOnce: true, order: 0, ...options },
		})

		return id
	}

	/**
	 * @description
	 * Remove all methods stored.
	 */
	reset(options?: ResetOptions) {
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
	async closeClient(client: MqttClient) {
		if (client) {
			await new Promise<void>((resolve, reject) => {
				client.end(true, (err) => {
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
	async closeServer(server: ServerBuilderInstance) {
		if (server?.listening) {
			await new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) reject(err)
					else resolve()
				})
			})
		}
	}

	/**
	 * @param id Method id to be executed.
	 *
	 * @description
	 * Execute a method stored by its id.
	 * If the method has the option `executeOnce` set to `true`, it will be removed after execution.
	 */
	async run(id: string) {
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
	async runAll() {
		if (this.#methods.size === 0) {
			return
		}

		const methodStored: (AddOptions & { key: string })[] = []

		for (const [key, { options }] of this.#methods) {
			methodStored.push({ ...options, key })
		}

		methodStored.sort((a, b) => b.order - a.order)
		const methods: Array<Promise<any>> = []

		for (const { key, ...options } of methodStored) {
			const { method, args } = this.#methods.get(key)

			if (method instanceof Promise) {
				methods.push(method)
			} else if (isAsyncFunction(method)) {
				const promise = new Promise<any>((resolve, reject) => {
					method(...args)
						.then(resolve)
						.catch(reject)
				})

				methods.push(promise)
			} else {
				const promise = new Promise<any>((resolve, reject) => {
					try {
						const result = method(...args)
						resolve(result)
					} catch (error) {
						reject(error)
					}
				})

				methods.push(promise)
			}

			if (options.executeOnce) {
				this.#methods.delete(key)
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

export default TeardownHelper
