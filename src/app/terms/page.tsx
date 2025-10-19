import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-2">Acceptance of Terms</h2>
              <p>
                By accessing and using RecipeChef, you accept and agree to be bound by the terms and provision 
                of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Use License</h2>
              <p>
                Permission is granted to temporarily use RecipeChef for personal, non-commercial transitory viewing only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">User Content</h2>
              <p>
                You are responsible for the content you upload and share. You agree not to upload content that 
                violates any laws or infringes on others' rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Prohibited Uses</h2>
              <p>
                You may not use RecipeChef for any unlawful purpose or to solicit others to perform unlawful acts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Disclaimer</h2>
              <p>
                The information on RecipeChef is provided on an "as is" basis. We make no warranties, expressed or implied.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us through our support channels.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
