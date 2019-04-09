import {
    FormGroup, 
    FormBuilder, 
    FormControl, 
    FormArray, 
    ValidatorFn, 
    AsyncValidatorFn, 
    NgControl, 
    ControlContainer, 
    AbstractControl, 
    FormGroupDirective, 
    FormArrayName, 
    FormGroupName
} from "@angular/forms"
import {EventEmitter, Output, Directive, Optional, NgModule, OnInit, HostListener, Input, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, Inject, forwardRef, ViewContainerRef, TemplateRef} from "@angular/core"
import * as jwt from 'jsonwebtoken'
import * as _ from "lodash"
import { ActivatedRoute } from "@angular/router";


const VALIDATION_MESSAGE_KEY = "__val_msgs__"
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

export interface ErrorModel {
    key : string
    msg : string
}

export interface FormSaveEvent<T> {
    oldData : T
    newData : T
}

interface FormBindAware {
    updateForm(form : AbstractControl) 
}

/**
 * This is used to bind the form instance and inform ferror or other directives on form binding change so that they
 * can react accordingly. This is developed to support reset of form.
 * 
 * Using formGroup.reset(oldData) is not desirable because if there are new control added, reseting will not remove the newly
 * added control. Hence, the strategy for resetting is recreate the whole form. However, directive such as [ferror] is not aware
 * of the new form instance and continue to monitor old form instance.
 * 
 */
@Directive({
    selector: "[fcoord]"
})
export class FormCoordinator implements OnChanges {

    @Input("fcoord")
    form : FormGroup

    directives : FormBindAware[] = []

    ngOnChanges(change : SimpleChanges) {
        if (change["form"]) {
            this.directives.forEach(d => d.updateForm(this.form))
        }
    }

    addDirective(bindAware : FormBindAware) {
        this.directives.push(bindAware)
    }

    removeDirective(bindAware : FormBindAware) {
        var i = 0
        for (; i < this.directives.length; i++)
            if (this.directives[i] === bindAware) break
        
        this.directives.splice(i,1)
    }

}

/**
 * A directive to set error for a form control / container. It is designed to work
 * with FormControl, FormGroup, and FormArray. The form has to be created using FormCreator below.
 * 
 * The form error directive obtains the control/container instance it needs to monitor for 
 * errors through dependency injection.
 */
@Directive({
    selector: "[ferror]"
})
export class FormError implements OnInit, FormBindAware, OnDestroy {

    // out that emit the error whenever it can detects one
    @Output('ferrorChange') udpate : EventEmitter<ErrorModel> = new EventEmitter<ErrorModel>()
    @Input('ferror') currentErrorMessage : ErrorModel

    control : AbstractControl
    // note that this is set when the control OWN VALIDATORS return valid. It doesn't coincide the validity of the control
    // for example, if the control is a FormGroup and one of its internal control is not valid, the FormGroup validity is FALSE
    // but if the FormGroup validator return VALID then this value is TRUE.
    isLastValid : boolean = false

    constructor(
        @Optional() private ngControl : NgControl, 
        @Optional() private group : ControlContainer,
        @Optional() private coordinator : FormCoordinator) {}

    ngOnInit() {
        
        if (this.ngControl) {
            this.control = this.ngControl.control
            this.control.statusChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
        } else if (this.group) {
            if (this.group instanceof FormGroupDirective) this.control = this.group.form
            else if (this.group instanceof FormGroupName || this.group instanceof FormArrayName) this.control = this.group.control

            this.control.valueChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
        }

        if (this.coordinator) this.coordinator.addDirective(this as FormBindAware)
    }

    @HostListener('blur')
    checkBlur() {
        if (this.control && this.control.pristine) {
            this.tryUpdateError(this.control)
        }
    }

    tryUpdateError(control : AbstractControl) {

        if (control.invalid) {
            if (control.errors) {
                this.extractAndEmitFirstError(control.errors, control[VALIDATION_MESSAGE_KEY])
            }

            if (control instanceof FormGroup || control instanceof FormArray) {
                // the group's own validators might be returning valid, but one of the internal control of the group
                // is not valid, resulting in the overall invalidity of the group.
                // In this case, we want to clear the errors created by the group's own validators.
                if (!control.errors && !this.isLastValid) {
                    this.isLastValid = true
                    this.udpate.emit(null)

                    return
                }
            }
        } else if (control.valid && !this.isLastValid) {
            this.udpate.emit(null)    // clear error if this time is valid and last time was not valid
        }

        this.isLastValid = control.valid

    }


    /**
     * TODO: Define the structure of messages / errors and allow custom interpretation of the error message. This is because sometimes validator method 
     * might produce error object with more than just a format of { '<code>' : '<message string>' }. One possible way is the user can attach an
     * interpreter in the messages object for example:
     * 
     * Errors can be: { '<code>' : <some complicated error object> } --> produced by validation function
     * Messages can be  { '<code> : <some interpreter which understand the error object> } --> this is attached to the control and the intepreter will be used 
     * to produce the error messages from the error object.
     * 
     * @param errors the errors of a control or control container
     * @param messages the messages map which contains the validation messages
     */
    extractAndEmitFirstError(errors : any, messages : any) {
        for (var key in errors) {
            if (messages && messages[key])
                this.udpate.emit({ key : key, msg: messages[key] })
            else if (errors[key]) 
                this.udpate.emit({key : key, msg: errors[key]})
            else this.udpate.emit({ key : key, msg : key })

            return
        }
    }

    updateForm(form : AbstractControl) {
        var path = []
        
        if (this.ngControl) path = this.ngControl.path
        else if (this.group) path = this.group.path

        var c = form.get(path)

        if (c) {
            this.control = c

            if (this.ngControl) {    
                this.control.statusChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
            } else if (this.group) {
                this.control.valueChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
            }
        }
    }

    ngOnDestroy() {
        if (this.coordinator) this.coordinator.removeDirective(this)
    }

}

@Directive({
    selector: "[form-flow-submit]"
})
export class FormFlowSubmit implements OnInit {

    @Input("form-flow-submit")
    formFlow : FormFlow

    constructor() {}

    @HostListener("click", ["$event"])
    onSubmit() {
        this.formFlow.startSearchProcess()
    }

    ngOnInit() {
        console.log(this.formFlow)
    }

}

export interface FormFlowNavigationData {
    params : any, 
    actualData : any
}

export interface FormFlowSearchEvent {
    data : any,
    from : "Params" | "Form"
}

export class FormFlowContext {
    $implicit : any = null
    fflow : FormFlow
}

/**
 * This directive implements a common form submitting flow which
 * involves setting forms from query parameters.
 */
@Directive({
    selector : "[fflow]"
})
export class FormFlow implements OnInit {

    private curData : any

    @Input()
    jwtKey : string = "fflowkey"

    @Input()
    paramKey : string = "searchData"

    @Input("fflow")
    form : FormGroup

    @Input("fflowBy")
    builder : (data? : any) => FormGroup

    /**
     * When user click the search button of the form, this component
     * will encode the form into JWT. Search action should be trigger
     * through using the router to navigate to a route with the same 
     * path as current path but with a query param searchData=[the JWT]
     */
    @Input("fflowNav")
    needNavigation : (data : FormFlowNavigationData) => void

    /**
     * Search action is navigationally triggered. This means that it only
     * produces event when the route with a query parameter searchData 
     * is visited
     */
    @Input("fflowSearch")
    search : (data : FormFlowSearchEvent) => void

    @Output()
    onReady : EventEmitter<boolean> = new EventEmitter()

    @Input()
    noNavigation = false

    @Input()
    ignoreInit = true

    constructor(private route : ActivatedRoute, private viewContainer : ViewContainerRef, private templateRef : TemplateRef<FormFlowContext>) {
        
    }

    ngOnInit() {
        this.route.queryParams.subscribe(p => {
            this.curData = this.createCriteriaFromParams(p)

            let shouldNavigate = false

            if (this.curData) {

                if (this.builder) 
                    this.form = this.builder(this.curData)

                this.search({ data : this.curData, from : "Params" })

            } else {
                
                // if no params available, build the default form if the builder is available
                if (this.builder) this.form = this.builder()
                
                if (this.form) shouldNavigate = !this.ignoreInit
            }

            // after initialization is done
            this.createView()

            if (shouldNavigate) this.startSearchProcess(this.curData)
            else this.onReady.next(true)
                
        })
    }

    createView() {
        this.viewContainer.clear();
        if (this.templateRef)
            this.viewContainer.createEmbeddedView(this.templateRef, {
                $implicit: this.form,
                fflow : this
            });
    }

    startSearchProcess(data? : any) {
        let raw = data || this.getRawSearchData()
        
        if (!this.noNavigation) {
            let searchToken = jwt.sign(raw, this.jwtKey)

            let params = { }
            params[this.paramKey] = searchToken

            this.needNavigation({
                params : params,
                actualData: raw
            })
        } else {
            this.search({ data : raw, from : "Form" })
        }
    }

    getRawSearchData() {
        let raw = this.form.getRawValue()

        return raw
    }

    createCriteriaFromParams(params? : { [key : string] : any }) {

		let c : any = null

		if (params) {
            let p = params[this.paramKey]
            if (p) c = jwt.verify(p, this.jwtKey)
              
		}

		return c
    }

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

@NgModule({
    declarations: [FormError, FormCoordinator, FormFlow, FormFlowSubmit],
    exports: [FormError, FormCoordinator, FormFlow, FormFlowSubmit]
})
export class FormUtilModule {

}