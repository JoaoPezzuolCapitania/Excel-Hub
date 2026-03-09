"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FileUpload } from "@/components/repo/file-upload";
import { Upload } from "lucide-react";

interface FileUploadButtonProps {
  repoId: string;
  branchId: string;
}

export function FileUploadButton({ repoId, branchId }: FileUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setIsOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Upload file
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Upload spreadsheet"
      >
        <FileUpload
          repoId={repoId}
          branchId={branchId}
          onSuccess={() => {
            setIsOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
