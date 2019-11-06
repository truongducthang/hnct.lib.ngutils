
import {EventEmitter, Output, Directive, OnInit, HostListener, Input, ViewContainerRef, TemplateRef, EmbeddedViewRef} from "@angular/core"
import * as jwt from 'jsonwebtoken'
import { ActivatedRoute } from "@angular/router";
import { FormGroup } from "@angular/forms";


@Directive({
    selector: "[form-flow-submit]"
})
export class FormFlowSubmit {

    @Input("form-flow-submit")
    formFlow : FormFlow

    constructor() {}

    @HostListener("click", ["$event"])
    onSubmit() {
        this.formFlow.startSearchProcess()
    }
}

export interface FormFlowNavigationData {
    params : any, 
    actualData : any
}

export interface FormFlowSubmitEvent {
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
    selector : "[fflow]",
    exportAs: "fflow"
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
     * Submit action is navigationally triggered. This means that it only
     * produces event when the route with a query parameter searchData 
     * is visited
     */
    @Input("fflowSubmit")
    submit : (data : FormFlowSubmitEvent) => void

    @Output()
    onReady : EventEmitter<boolean> = new EventEmitter()

    @Input()
    noNavigation = false

    @Input("fflowIgnoreInit")
    ignoreInit = true

    viewRef : EmbeddedViewRef<any>

    constructor(private route : ActivatedRoute, private viewContainer : ViewContainerRef, private templateRef : TemplateRef<FormFlowContext>) {
        
    }

    ngOnInit() {
        this.route.queryParams.subscribe(p => {
            this.curData = this.createCriteriaFromParams(p)

            let shouldNavigate = false

            if (this.curData) {

                if (this.builder) 
                    this.form = this.builder(this.curData)

                this.submit({ data : this.curData, from : "Params" })

            } else {
                
                // if no params available, build the default form if the builder is available
                if (this.builder) this.form = this.builder()
                
                if (this.form) shouldNavigate = !this.ignoreInit
            }

            // after initialization is done
            this.createView()

            if (shouldNavigate) this.startSearchProcess(this.curData)
            else this.onReady.emit(true)
        })
    }

    createView() {
        this.viewContainer.clear();
        if (this.templateRef)
            this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, {
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
            this.submit({ data : raw, from : "Form" })
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

    canSubmit() {
        return this.form && this.form.dirty && this.form.valid
    }

    dirty() {
        return this.form && this.form.dirty
    }

    reset(newData : any) {

        this.curData = newData || this.curData

        this.form = this.builder(this.curData)
        this.viewRef.context.$implicit = this.form

    }

}