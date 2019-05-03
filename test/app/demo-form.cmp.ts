import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { FormCreator, FormFlowNavigationData, FormFlowSubmitEvent } from "../../src/ts";
import { Router, ActivatedRoute } from "@angular/router";

@Component({
    selector: "demo-form",
    templateUrl: "./demo-form.html"
})
export class DemoForm {

    constructor(private fb : FormBuilder, private router : Router, private route : ActivatedRoute) {}

    buildForm = (data? : any) => {

        data = data || {
            username : null,
            password : null
        }

        return new FormCreator(this.fb, data).validators({
            username : [Validators.required],
            password : [Validators.required]
        })
        .validatorMessages({
            username : { required : "This is required" },
            password : { required : "This is required" },
        })
        .build()
    }

    navigate = (event : FormFlowNavigationData) => {
        this.router.navigate(["."], {
            relativeTo: this.route,
            queryParams: event.params
        })
    }

    search = (data : FormFlowSubmitEvent) => {
        console.log("Searching " + JSON.stringify(data))
    }
}