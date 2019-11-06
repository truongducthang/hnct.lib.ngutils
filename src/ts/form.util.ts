import {
    FormGroup, 
    FormBuilder, 
    FormControl, 
    FormArray, 
    ValidatorFn, 
    AsyncValidatorFn, 
    AbstractControl} from "@angular/forms"
import * as _ from "lodash"


export const VALIDATION_MESSAGE_KEY = "__val_msgs__"
// For a form group or form array, the validation can
// happens at individual field or for the whole group or array.
// in the case we want to have validation for the whole group, the validation definition
// defined in the field __self__ of the validator object will be used for the form group
// Further more, if the field __fields__ is present, the validation definition defined by this
// field will be used for the other fields of the form group
// example :
// An object of following format
// {
//     abc : ""
//     pqr : ""
// }
// and the validation definition of following format
// {
//     __self__ : [Validators.required],
//     __fields__ : {
//         abc : [Validators.minlength(10)]
//         pqr : [Validators.maxlength(20)]
//     }
// }
export const SELF_KEY = "__self__"
export const FIELD_KEY = "__fields__"
// sometimes, we don't want to build an array field as an array of control, but instead,
// a normal form control whose value is an array. This is applicable for case such as
// multiple select form control, whose products is say, an array of string.
export const IGNORE_ARR_KEY = "__ignore_arr__"

export interface _ValDef_ {
    [p : string] : _ValDef_ | (_ValDef_ | ValidatorFn[])[] | ValidatorFn | ValidatorFn[]
}

export type ValDef = _ValDef_ | (_ValDef_ | ValidatorFn[])[] | ValidatorFn | ValidatorFn[]

export interface _AsyncValDef_ {
    [p : string] : _AsyncValDef_ | (_AsyncValDef_ | AsyncValidatorFn[])[] | AsyncValidatorFn | AsyncValidatorFn[]
}

export type AsyncValDef = _AsyncValDef_ | (_AsyncValDef_ | AsyncValidatorFn[])[] | AsyncValidatorFn | AsyncValidatorFn[]

export interface FormSaveEvent<T> {
    oldData : T
    newData : T
}

/**
 * Form creator allows creating reactive forms from object. Fields of objects will be converted to 
 * corresponding form control. If validators and validation messages are set, they will be added
 * correspondingly. The validation messages will be put in the form control so that FormError
 * directive can use directly.
 */
export class FormCreator {

    msges: any;
    v: ValDef;
    aV: AsyncValDef;

    constructor(private builder : FormBuilder, private data : any) {

    }

    asyncValidators(asyncs : AsyncValDef) : FormCreator {
        this.aV = asyncs

        return this
    }

    validators(syncs : ValDef) : FormCreator {
        this.v = syncs

        return this
    }

    validatorMessages(msges : any) : FormCreator {
        this.msges = msges

        return this
    }

    build() : FormGroup {
        return this.buildObject(this.data, this.v, this.aV, this.msges)
    }

    buildObject(data : any, v : ValDef, aV : AsyncValDef, msges : any) : FormGroup {

        var formGroup = this.builder.group({})

        if (v) {
            if (v[SELF_KEY]) formGroup.setValidators(v[SELF_KEY] as ValidatorFn[] | ValidatorFn)
            if (v[FIELD_KEY]) v = v[FIELD_KEY]
        }

        if (aV) {
            if (aV[SELF_KEY]) formGroup.setAsyncValidators(aV[SELF_KEY] as AsyncValidatorFn[] | AsyncValidatorFn)
            if (aV[FIELD_KEY]) aV = aV[FIELD_KEY]
        }
        
        
        if (msges) {
            // attach the corresponding validation messages to the form group so that form error directive can use
            if (msges[SELF_KEY]) formGroup[VALIDATION_MESSAGE_KEY] = msges[SELF_KEY]
            if (msges[FIELD_KEY]) msges = msges[FIELD_KEY]
        }

        _.forIn(data, (value, key) => {
            formGroup.addControl(key, this.buildFieldOrIndex(key, value, v, aV, msges))
        })

        return formGroup
    }

    buildFieldOrIndex(key : string | number, value : any | any[], v : ValDef | ValDef[], aV : AsyncValDef | AsyncValDef[], msges : any | any[]) : AbstractControl {

        if (v && v[key]) v = v[key] 
        else v = null
        if (aV && aV[key]) aV = aV[key]
        else aV = null
        if (msges && msges[key]) msges = msges[key]
        else msges = null

        if (_.isNull(value) || _.isNumber(value) || _.isString(value) || _.isBoolean(value)) return this.buildPrimitive(value, v as ValDef, aV as AsyncValDef, msges)
        else if (_.isArray(value)) return this.buildArray(value, v as ValDef, aV as AsyncValDef, msges)
        else return this.buildObject(value, v as ValDef, aV as AsyncValDef, msges)
    }

    buildPrimitive(value : any, v : ValDef, aV : AsyncValDef, msges : any) : AbstractControl {
        let c = new FormControl(value)
        if (v) c.setValidators(v as ValidatorFn | ValidatorFn[])
        if (aV) c.setAsyncValidators(aV as AsyncValidatorFn | AsyncValidatorFn[])
        if (msges) c[VALIDATION_MESSAGE_KEY] = msges

        return c
    }

    buildArray(values : any[], v : ValDef, aV : AsyncValDef, msges : any) : FormArray | FormControl {

        let ignore_array = (v && _.isPlainObject(v) && v[IGNORE_ARR_KEY]) || 
                            (aV && _.isPlainObject(aV) && aV[IGNORE_ARR_KEY])

        var arr = ignore_array ? this.builder.control(values) : this.builder.array([])
        
        // if the validator is an object and not an array, we have to search for SELF_KEY as the user might want overall array validation
        if (v && _.isPlainObject(v)) {
            if (v[SELF_KEY]) arr.setValidators(v[SELF_KEY] as ValidatorFn | ValidatorFn[])
            if (v[FIELD_KEY]) v = v[FIELD_KEY]
        }

        // if the validator is an object and not an array, we have to search for SELF_KEY as the user might want overall array validation
        if (aV && _.isPlainObject(aV)) {
            if (aV[SELF_KEY]) arr.setAsyncValidators(aV[SELF_KEY] as AsyncValidatorFn | AsyncValidatorFn[])
            if (aV[FIELD_KEY]) aV = aV[FIELD_KEY]
        }

        if (msges && _.isPlainObject(msges)) {
            if (msges[SELF_KEY]) arr[VALIDATION_MESSAGE_KEY] = msges[SELF_KEY]
            if (msges[FIELD_KEY]) msges = msges[FIELD_KEY]
        }
        
        if (!ignore_array) {
            let arr1 = arr as FormArray
            _.forEach(values, (element, index) => {
                arr1.push(this.buildFieldOrIndex(index, element, v, aV, msges))
            })
        }

        return arr
    }
}