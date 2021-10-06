import { Request, Response } from "express"
import { validationResult } from "express-validator"
import { Model } from "sequelize-typescript"
import Resource from "../resources/resources"
import RequestService from "../services/request.services"
import ResponseService from "../services/response.services"

export type CollectionType = <T extends Model>(models: T[] | null | undefined, options?: { fileFields: string[]; } | undefined) => ResponseType[]

type ModelType<T> = T[] | { rows: T[], count: number }

export default class Controller {


    /**
     * Check result of validation in {@link validationResult} express validator class
     * @param req request for check result in request
     * @returns 
     */
    protected static checkValidationResult(req: Request) {
        const error = validationResult(req)
        if (error.isEmpty()) return
        throw error
    }

    /**
     * Make a response as json for models list
     * @param res 
     * @param field name of field that models want to list
     * @param models list of models instances
     * @param formatter formatter is type of resource class for models {@link Resource}
     * @param req if you set req value, in final response the value of pages and page has fixed
     * @returns 
     */
    protected static responseModels<T extends Model>(res: Response, field: string, models: ModelType<T> | Promise<ModelType<T>>,
        formatter?: any, req?: Request) {

        if (models instanceof Promise) {
            models.then(models => {
                Controller.responseModels(res, field, models, formatter, req)
            }).handleCatch(res)
            return
        }

        if (!formatter) {
            formatter = Resource
        }

        const response = ResponseService.newInstance(res)
        if (Array.isArray(models)) {
            response.set(field, formatter.collection(models))
        } else {
            response.set(field, formatter.collection(models.rows))

            if (req) {
                const pagination = RequestService.pagination(req)
                const pages = Number.parseInt((models.count / pagination.countPerPage).toString()) + 1
                response.set('pages', pages)
                response.set('page', pagination.page)
            }

            response.set('total', models.count)
        }
        response.setStatus(true)
        return response.response()
    }
}

declare global {
    interface Promise<T> {
        handleCatch(res: Response): Promise<T>
    }
}

Promise.prototype.handleCatch = function <T>(res: Response): Promise<T> {
    this.catch(reason => {
        ResponseService.handleError(res, reason)
    })
    return this
}